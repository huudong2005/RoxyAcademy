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
    public async Task<ActionResult<IEnumerable<PaymentDto>>> GetPayments(
        [FromQuery] int? tuitionId,
        [FromQuery] string? paymentMethod,
        [FromQuery] string? status)
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

        if (tuitionId.HasValue)
            q = q.Where(p => p.TuitionId == tuitionId.Value);

        if (!string.IsNullOrWhiteSpace(paymentMethod))
            q = q.Where(p => p.PaymentMethod == paymentMethod.Trim());

        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(p => p.Status == status.Trim());

        var list = await q.OrderByDescending(p => p.CreatedAt)
            .Select(p => new PaymentDto(
                p.Id,
                p.TuitionId,
                p.Amount,
                p.PaymentMethod,
                p.Status,
                p.TransactionCode,
                p.ProofImageUrl,
                p.PaidAt,
                p.ConfirmedBy,
                p.ConfirmedByNavigation != null ? p.ConfirmedByNavigation.FullName : null,
                p.ConfirmedAt,
                p.Note,
                p.CreatedAt,
                p.Tuition.Title,
                p.Tuition.Student.FullName
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

        if (p == null)
            return NotFound(new { message = "Không tìm thấy giao dịch thanh toán này." });

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
            p.Id,
            p.TuitionId,
            p.Amount,
            p.PaymentMethod,
            p.Status,
            p.TransactionCode,
            p.ProofImageUrl,
            p.PaidAt,
            p.ConfirmedBy,
            p.ConfirmedByNavigation != null ? p.ConfirmedByNavigation.FullName : null,
            p.ConfirmedAt,
            p.Note,
            p.CreatedAt,
            p.Tuition.Title,
            p.Tuition.Student.FullName
        ));
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,BranchManager,Parent,Student")]
    public async Task<ActionResult> CreatePayment(CreatePaymentRequest req)
    {
        var tuition = await db.Tuitions
            .Include(t => t.Student)
            .FirstOrDefaultAsync(t => t.Id == req.TuitionId);

        if (tuition == null)
            return BadRequest(new { message = "Khoản thu học phí không tồn tại." });

        if (tuition.IsCancelled)
            return BadRequest(new { message = "Khoản học phí này đã bị hủy, không thể thực hiện thanh toán." });

        if (Role == "Parent" && tuition.Student.ParentId != UserId)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Không thể thanh toán khoản thu của học viên khác." });

        if (Role == "Student" && tuition.Student.UserId != UserId)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Không thể thanh toán khoản thu của học viên khác." });

        if (Role == "BranchManager" && tuition.BranchId != (User.GetBranchId() ?? -1))
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Không thể thao tác trên khoản thu của cơ sở khác." });

        if (req.Amount <= 0)
            return BadRequest(new { message = "Số tiền thanh toán phải lớn hơn 0." });

        // Kiểm tra số tiền còn nợ trước khi lưu để tránh trigger DB ném lỗi 500
        var currentPaid = await db.Payments
            .Where(p => p.TuitionId == req.TuitionId && p.Status == "Confirmed")
            .SumAsync(p => (decimal?)p.Amount) ?? 0m;

        var netAmount = tuition.Amount - tuition.Discount;
        var remainingAmount = Math.Max(0m, netAmount - currentPaid);

        if (remainingAmount <= 0)
        {
            return BadRequest(new { message = "Khoản học phí này đã được thanh toán đầy đủ, không thể nộp thêm." });
        }

        if (req.Amount > remainingAmount)
        {
            return BadRequest(new
            {
                message = $"Số tiền thanh toán ({req.Amount:N0} đ) vượt quá số tiền còn nợ ({remainingAmount:N0} đ). Tổng phải thu: {netAmount:N0} đ, đã thanh toán: {currentPaid:N0} đ."
            });
        }

        // Logic trạng thái:
        // Nhân viên thu trực tiếp (Staff) -> "Confirmed", tự động gán ConfirmedBy
        // Phụ huynh/Học viên nộp qua App -> "PendingConfirm", chờ nhân viên kiểm tra xác nhận
        var status = IsStaff ? "Confirmed" : "PendingConfirm";
        var confirmedBy = IsStaff ? UserId : (int?)null;
        var confirmedAt = IsStaff ? DateTime.UtcNow : (DateTime?)null;

        var payment = new Payment
        {
            TuitionId = req.TuitionId,
            Amount = req.Amount,
            PaymentMethod = req.PaymentMethod,
            Status = status,
            TransactionCode = req.TransactionCode?.Trim(),
            ProofImageUrl = req.ProofImageUrl?.Trim(),
            PaidAt = req.PaidAt ?? DateTime.UtcNow,
            ConfirmedBy = confirmedBy,
            ConfirmedAt = confirmedAt,
            Note = req.Note?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        db.Payments.Add(payment);
        await db.SaveChangesAsync();

        // Gửi thông báo đến phụ huynh (nếu có tài khoản) khi staff ghi nhận thanh toán
        try
        {
            if (IsStaff && tuition.Student.ParentId > 0)
            {
                db.Notifications.Add(new Notification
                {
                    UserId = tuition.Student.ParentId,
                    Title = "Biên nhận học phí mới",
                    Body = $"Khoản thanh toán {payment.Amount:N0} đ cho '{tuition.Title}' của học viên {tuition.Student.FullName} đã được ghi nhận.",
                    Type = "Tuition",
                    RefId = tuition.Id,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
                await db.SaveChangesAsync();
            }
        }
        catch
        {
            // Email/Notification lỗi không làm ảnh hưởng việc lưu thanh toán thành công
        }

        return CreatedAtAction(nameof(GetPayment), new { id = payment.Id }, new
        {
            message = IsStaff ? "Ghi nhận thanh toán thành công!" : "Gửi yêu cầu thanh toán thành công, vui lòng chờ nhân viên xác nhận!",
            id = payment.Id,
            status = payment.Status,
            amount = payment.Amount
        });
    }

    [HttpPut("{id}/confirm")]
    [Authorize(Roles = "SuperAdmin,BranchManager")]
    public async Task<IActionResult> ConfirmPayment(int id, ConfirmPaymentRequest req)
    {
        var payment = await db.Payments
            .Include(p => p.Tuition)
                .ThenInclude(t => t.Student)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (payment == null)
            return NotFound(new { message = "Không tìm thấy giao dịch thanh toán này." });

        if (Role == "BranchManager" && payment.Tuition.BranchId != (User.GetBranchId() ?? -1))
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Không thể xác nhận giao dịch của cơ sở khác." });

        if (payment.Status != "PendingConfirm")
            return BadRequest(new { message = $"Chỉ có thể duyệt các giao dịch đang ở trạng thái 'PendingConfirm' (trạng thái hiện tại: '{payment.Status}')." });

        if (payment.Tuition.IsCancelled)
            return BadRequest(new { message = "Khoản học phí này đã bị hủy, không thể xác nhận thanh toán." });

        if (req.Status == "Confirmed")
        {
            // Kiểm tra overpay trước khi confirm để tránh lỗi trigger TR_Payments_NoOverpay (500)
            var otherConfirmedPaid = await db.Payments
                .Where(p => p.TuitionId == payment.TuitionId && p.Id != payment.Id && p.Status == "Confirmed")
                .SumAsync(p => (decimal?)p.Amount) ?? 0m;

            var netAmount = payment.Tuition.Amount - payment.Tuition.Discount;
            if (otherConfirmedPaid + payment.Amount > netAmount)
            {
                var remaining = Math.Max(0m, netAmount - otherConfirmedPaid);
                return BadRequest(new
                {
                    message = $"Không thể xác nhận: Số tiền của giao dịch ({payment.Amount:N0} đ) cộng với số tiền đã thanh toán ({otherConfirmedPaid:N0} đ) vượt quá tổng số phải thu ({netAmount:N0} đ). Số tiền còn nợ tối đa là {remaining:N0} đ."
                });
            }
        }

        payment.Status = req.Status;
        if (!string.IsNullOrWhiteSpace(req.Note))
            payment.Note = req.Note.Trim();

        // Thỏa mãn CK_Payments_Reviewed: Cứ đổi trạng thái (Confirmed/Rejected) là phải lưu dấu vết người duyệt
        payment.ConfirmedBy = UserId;
        payment.ConfirmedAt = DateTime.UtcNow;
        if (!payment.PaidAt.HasValue)
            payment.PaidAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        // Gửi thông báo đến phụ huynh khi giao dịch được xác nhận hoặc bị từ chối
        try
        {
            if (payment.Tuition.Student.ParentId > 0)
            {
                var statusText = req.Status == "Confirmed" ? "đã được xác nhận" : "bị từ chối";
                db.Notifications.Add(new Notification
                {
                    UserId = payment.Tuition.Student.ParentId,
                    Title = req.Status == "Confirmed" ? "Thanh toán học phí thành công" : "Thanh toán học phí bị từ chối",
                    Body = $"Giao dịch thanh toán {payment.Amount:N0} đ cho '{payment.Tuition.Title}' {statusText}.{(string.IsNullOrWhiteSpace(req.Note) ? "" : $" Ghi chú: {req.Note}")}",
                    Type = "Tuition",
                    RefId = payment.TuitionId,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
                await db.SaveChangesAsync();
            }
        }
        catch
        {
            // Email/Notification lỗi không làm ảnh hưởng việc xác nhận giao dịch thành công
        }

        return Ok(new
        {
            message = req.Status == "Confirmed" ? "Xác nhận thanh toán thành công!" : "Đã từ chối giao dịch thanh toán.",
            id = payment.Id,
            status = payment.Status
        });
    }
}
