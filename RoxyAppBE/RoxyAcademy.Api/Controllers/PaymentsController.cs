using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoxyAcademy.Api.Data;
using RoxyAcademy.Api.Dtos;
using RoxyAcademy.Api.Extensions;
using RoxyAcademy.Api.Models;

namespace RoxyAcademy.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class PaymentsController(RoxyDbContext db) : ControllerBase
{
	private string Role => User.GetRole();
	private int UserId => User.GetUserId();
	private bool IsStaff => Role is "SuperAdmin" or "BranchManager";

	[HttpGet]
	public async Task<ActionResult<IEnumerable<PaymentDto>>> GetPayments([FromQuery] int? tuitionId)
	{
		// Giáo viên không được xem thanh toán
		if (Role == "Teacher")
			return Forbid();

		var q = db.Payments
			.Include(p => p.Tuition)
				.ThenInclude(t => t.Student)
			.Include(p => p.ConfirmedByNavigation)
			.AsQueryable();

		switch (Role)
		{
			case "SuperAdmin":
				break;
			case "BranchManager":
				var branchId = User.GetBranchId() ?? -1;
				q = q.Where(p => p.Tuition.BranchId == branchId);
				break;
			case "Parent":
				q = q.Where(p => p.Tuition.Student.ParentId == UserId);
				break;
			case "Student":
				q = q.Where(p => p.Tuition.Student.UserId == UserId);
				break;
			default:
				return Forbid();
		}

		if (tuitionId.HasValue) q = q.Where(p => p.TuitionId == tuitionId);

		var list = await q.OrderByDescending(p => p.CreatedAt)
			.Select(p => new PaymentDto(
				p.Id, p.TuitionId, p.Amount, p.PaymentMethod, p.Status,
				p.TransactionCode, p.ProofImageUrl, p.PaidAt,
				p.ConfirmedBy, p.ConfirmedByNavigation != null ? p.ConfirmedByNavigation.FullName : null,
				p.ConfirmedAt, p.Note, p.CreatedAt
			)).ToListAsync();

		return Ok(list);
	}

	[HttpGet("{id}")]
	public async Task<ActionResult<PaymentDto>> GetPayment(int id)
	{
		// Giáo viên không được xem thanh toán
		if (Role == "Teacher")
			return Forbid();

		var p = await db.Payments
			.Include(p => p.Tuition)
				.ThenInclude(t => t.Student)
			.Include(p => p.ConfirmedByNavigation)
			.FirstOrDefaultAsync(p => p.Id == id);

		if (p == null) return NotFound(new { message = "Không tìm thấy giao dịch thanh toán này." });

		// Học viên chỉ được xem thanh toán của chính mình
		if (Role == "Student" && p.Tuition.Student.UserId != UserId)
			return Forbid();

		// Phụ huynh chỉ được xem thanh toán của con mình
		if (Role == "Parent" && p.Tuition.Student.ParentId != UserId)
			return Forbid();

		// Quản lý cơ sở chỉ được xem thanh toán của cơ sở mình
		if (Role == "BranchManager" && p.Tuition.BranchId != (User.GetBranchId() ?? -1))
			return Forbid();

		return Ok(new PaymentDto(
			p.Id, p.TuitionId, p.Amount, p.PaymentMethod, p.Status,
			p.TransactionCode, p.ProofImageUrl, p.PaidAt,
			p.ConfirmedBy, p.ConfirmedByNavigation != null ? p.ConfirmedByNavigation.FullName : null,
			p.ConfirmedAt, p.Note, p.CreatedAt
		));
	}

	[HttpPost]
	[Authorize(Roles = "SuperAdmin,BranchManager,Parent")]
	public async Task<ActionResult<PaymentDto>> CreatePayment(CreatePaymentRequest req)
	{
		var tuition = await db.Tuitions.Include(t => t.Student).FirstOrDefaultAsync(t => t.Id == req.TuitionId);
		if (tuition == null) return BadRequest(new { message = "Khoản thu không tồn tại." });

		if (Role == "Parent" && tuition.Student.ParentId != UserId)
			return StatusCode(StatusCodes.Status403Forbidden, new { message = "Không thể thanh toán khoản thu của người khác." });

		if (Role == "BranchManager" && tuition.BranchId != User.GetBranchId())
			return StatusCode(StatusCodes.Status403Forbidden, new { message = "Không thể thao tác trên khoản thu của cơ sở khác." });

		// Logic trạng thái theo ràng buộc Database:
		// Nhân viên thu trực tiếp -> "Confirmed", tự động gán ConfirmedBy
		// Phụ huynh báo cáo CK -> "PendingConfirm", ConfirmedBy = null
		var status = IsStaff ? "Confirmed" : "PendingConfirm";
		var confirmedBy = IsStaff ? UserId : (int?)null;
		var confirmedAt = IsStaff ? DateTime.UtcNow : (DateTime?)null;

		var payment = new Payment
		{
			TuitionId = req.TuitionId,
			Amount = req.Amount,
			PaymentMethod = req.PaymentMethod,
			Status = status,
			TransactionCode = req.TransactionCode,
			ProofImageUrl = req.ProofImageUrl,
			PaidAt = req.PaidAt ?? DateTime.UtcNow,
			ConfirmedBy = confirmedBy,
			ConfirmedAt = confirmedAt,
			Note = req.Note,
			CreatedAt = DateTime.UtcNow
		};

		db.Payments.Add(payment);
		await db.SaveChangesAsync();

		return Ok(new { message = "Ghi nhận thanh toán thành công!", id = payment.Id });
	}

	[HttpPut("{id}/confirm")]
	[Authorize(Roles = "SuperAdmin,BranchManager")]
	public async Task<IActionResult> ConfirmPayment(int id, ConfirmPaymentRequest req)
	{
		var payment = await db.Payments.Include(p => p.Tuition).FirstOrDefaultAsync(p => p.Id == id);
		if (payment == null) return NotFound(new { message = "Không tìm thấy giao dịch thanh toán này." });

		if (Role == "BranchManager" && payment.Tuition.BranchId != User.GetBranchId())
			return StatusCode(StatusCodes.Status403Forbidden);

		if (payment.Status != "PendingConfirm")
			return BadRequest(new { message = "Chỉ có thể duyệt các giao dịch đang ở trạng thái PendingConfirm." });

		payment.Status = req.Status;
		payment.Note = req.Note ?? payment.Note;

		// Thỏa mãn CK_Payments_Reviewed: Cứ đổi trạng thái (Confirmed/Rejected) là phải lưu dấu vết người duyệt
		payment.ConfirmedBy = UserId;
		payment.ConfirmedAt = DateTime.UtcNow;

		await db.SaveChangesAsync();
		return NoContent();
	}
}