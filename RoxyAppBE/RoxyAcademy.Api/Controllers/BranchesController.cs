using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoxyAcademy.Api.Data;
using RoxyAcademy.Api.Dtos;
using RoxyAcademy.Api.Models;

namespace RoxyAcademy.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize] // Bắt buộc phải có token (đã đăng nhập) mới được gọi API trong này
public class BranchesController(RoxyDbContext db) : ControllerBase
{
	// 1. LẤY DANH SÁCH (READ ALL) - Ai đăng nhập cũng xem được
	[HttpGet]
	public async Task<ActionResult<IEnumerable<BranchDto>>> GetBranches()
	{
		var branches = await db.Branches
			.Select(b => new BranchDto(
				b.Id,
				b.BranchName,
				b.Address,
				b.Phone,
				b.IsActive,
				b.CreatedAt,
				db.Classes.Count(c => c.BranchId == b.Id && c.Status != "Finished"),
				db.Students.Count(s => s.BranchId == b.Id && s.Status == "Active"),
				db.Users.Count(u => u.BranchId == b.Id && u.Role == "Teacher" && u.IsActive)
			))
			.ToListAsync();

		return Ok(branches);
	}

	// 2. LẤY CHI TIẾT 1 CƠ SỞ (READ ONE)
	[HttpGet("{id}")]
	public async Task<ActionResult<BranchDto>> GetBranch(int id)
	{
		var branch = await db.Branches
			.Where(b => b.Id == id)
			.Select(b => new BranchDto(
				b.Id,
				b.BranchName,
				b.Address,
				b.Phone,
				b.IsActive,
				b.CreatedAt,
				db.Classes.Count(c => c.BranchId == b.Id && c.Status != "Finished"),
				db.Students.Count(s => s.BranchId == b.Id && s.Status == "Active"),
				db.Users.Count(u => u.BranchId == b.Id && u.Role == "Teacher" && u.IsActive)
			))
			.FirstOrDefaultAsync();

		if (branch == null) return NotFound(new { message = "Không tìm thấy cơ sở này." });

		return Ok(branch);
	}

	// 3. THÊM MỚI (CREATE) - Chỉ SuperAdmin được làm
	[HttpPost]
	[Authorize(Roles = "SuperAdmin")]
	public async Task<ActionResult<BranchDto>> CreateBranch(CreateBranchRequest req)
	{
		var branch = new Branch
		{
			BranchName = req.BranchName,
			Address = req.Address,
			Phone = req.Phone,
			IsActive = true,
			CreatedAt = DateTime.UtcNow
		};

		db.Branches.Add(branch);
		await db.SaveChangesAsync();

		var dto = new BranchDto(branch.Id, branch.BranchName, branch.Address, branch.Phone, branch.IsActive, branch.CreatedAt, 0, 0, 0);
		return CreatedAtAction(nameof(GetBranch), new { id = branch.Id }, dto);
	}

	// 4. CẬP NHẬT (UPDATE) - Chỉ SuperAdmin được làm
	[HttpPut("{id}")]
	[Authorize(Roles = "SuperAdmin")]
	public async Task<IActionResult> UpdateBranch(int id, UpdateBranchRequest req)
	{
		var branch = await db.Branches.FindAsync(id);
		if (branch == null) return NotFound(new { message = "Không tìm thấy cơ sở này." });

		if (branch.IsActive && !req.IsActive)
		{
			var validationError = await ValidateBranchDeactivationAsync(id);
			if (validationError != null) return validationError;
		}

		branch.BranchName = req.BranchName;
		branch.Address = req.Address;
		branch.Phone = req.Phone;
		branch.IsActive = req.IsActive;

		await db.SaveChangesAsync();
		return NoContent(); // 204: Thành công nhưng không cần trả về body
	}

	// 5. XÓA (DELETE) - Xóa mềm (Soft Delete) - Chỉ SuperAdmin được làm
	[HttpDelete("{id}")]
	[Authorize(Roles = "SuperAdmin")]
	public async Task<IActionResult> DeleteBranch(int id)
	{
		var branch = await db.Branches.FindAsync(id);
		if (branch == null) return NotFound(new { message = "Không tìm thấy cơ sở này." });

		var validationError = await ValidateBranchDeactivationAsync(id);
		if (validationError != null) return validationError;

		// Thay vì xóa cứng (Remove) có thể gây lỗi khóa ngoại, ta dùng xóa mềm (đổi trạng thái)
		branch.IsActive = false;
		await db.SaveChangesAsync();

		return NoContent();
	}

	private async Task<IActionResult?> ValidateBranchDeactivationAsync(int branchId)
	{
		var openClassesCount = await db.Classes.CountAsync(c => c.BranchId == branchId && c.Status != "Finished");
		var activeStudentsCount = await db.Students.CountAsync(s => s.BranchId == branchId && s.Status == "Active");
		var activeTeachersCount = await db.Users.CountAsync(u => u.Role == "Teacher" && u.BranchId == branchId && u.IsActive);
		var unpaidTuitionsCount = await db.Tuitions.CountAsync(t =>
			t.BranchId == branchId &&
			!t.IsCancelled &&
			(t.Payments.Where(p => p.Status == "Confirmed").Sum(p => (decimal?)p.Amount) ?? 0m) < (t.Amount - t.Discount));
		var pendingPaymentsCount = await db.Payments.CountAsync(p =>
			p.Status == "PendingConfirm" && p.Tuition.BranchId == branchId);
		var pendingLeavesCount = await db.LeaveRequests.CountAsync(lr =>
			lr.Status == "Pending" &&
			((lr.Class != null && lr.Class.BranchId == branchId) ||
			 (lr.Student != null && lr.Student.BranchId == branchId) ||
			 (lr.User != null && lr.User.BranchId == branchId)));
		var pendingSubmissionsCount = await db.HomeworkSubmissions.CountAsync(hs =>
			hs.Status == "Pending" && hs.Homework.Class.BranchId == branchId);

		var reasons = new List<string>();
		if (openClassesCount > 0) reasons.Add($"{openClassesCount} lớp đang mở");
		if (activeStudentsCount > 0) reasons.Add($"{activeStudentsCount} học viên đang học");
		if (activeTeachersCount > 0) reasons.Add($"{activeTeachersCount} giáo viên đang hoạt động");
		if (unpaidTuitionsCount > 0) reasons.Add($"{unpaidTuitionsCount} khoản học phí chưa thu đủ");
		if (pendingPaymentsCount > 0) reasons.Add($"{pendingPaymentsCount} thanh toán chờ xác nhận");
		if (pendingLeavesCount > 0) reasons.Add($"{pendingLeavesCount} đơn nghỉ phép chờ duyệt");
		if (pendingSubmissionsCount > 0) reasons.Add($"{pendingSubmissionsCount} bài tập chưa nộp (Pending)");

		if (reasons.Count > 0)
		{
			return Conflict(new
			{
				message = $"Không thể ngừng hoạt động chi nhánh vì còn: {string.Join("; ", reasons)}. Vui lòng xử lý toàn bộ trước khi ngừng chi nhánh.",
				reasons
			});
		}

		return null;
	}
}