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
public class StudentClassesController(RoxyDbContext db) : ControllerBase
{
	private string Role => User.GetRole();
	private int UserId => User.GetUserId();
	private bool IsStaff => Role is "SuperAdmin" or "BranchManager";

	[HttpGet]
	public async Task<ActionResult<IEnumerable<StudentClassDto>>> GetStudentClasses([FromQuery] int? studentId, [FromQuery] int? classId)
	{
		var q = db.StudentClasses
			.Include(sc => sc.Student)
			.Include(sc => sc.Class)
			.Include(sc => sc.ApprovedByNavigation)
			.AsQueryable();

		// Phân quyền dữ liệu
		if (Role == "Parent")
			q = q.Where(sc => sc.Student.ParentId == UserId);
		else if (Role == "Student")
			q = q.Where(sc => sc.Student.UserId == UserId);
		else if (Role == "Teacher")
			q = q.Where(sc => sc.Class.TeacherId == UserId);
		else if (Role == "BranchManager")
		{
			var branchId = User.GetBranchId();
			q = q.Where(sc => sc.Class.BranchId == branchId);
		}

		if (studentId.HasValue) q = q.Where(sc => sc.StudentId == studentId);
		if (classId.HasValue) q = q.Where(sc => sc.ClassId == classId);

		var list = await q.OrderByDescending(sc => sc.RegisteredAt)
			.Select(sc => new StudentClassDto(
				sc.Id, sc.StudentId, sc.Student.FullName,
				sc.ClassId, sc.Class.ClassName,
				sc.Status, sc.RegisteredAt,
				sc.ApprovedBy, sc.ApprovedByNavigation != null ? sc.ApprovedByNavigation.FullName : null,
				sc.ApprovedAt, sc.Note))
			.ToListAsync();

		return Ok(list);
	}

	[HttpPost]
	[Authorize(Roles = "SuperAdmin,BranchManager,Parent")]
	public async Task<ActionResult<StudentClassDto>> RegisterClass(CreateStudentClassRequest req)
	{
		var student = await db.Students.FindAsync(req.StudentId);
		if (student == null || student.Status == "Dropped")
			return BadRequest(new { message = "Học viên không tồn tại hoặc đã ngừng học." });

		if (Role == "Parent" && student.ParentId != UserId)
			return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn chỉ có thể đăng ký lớp cho con của mình." });

		var cls = await db.Classes.FindAsync(req.ClassId);
		if (cls == null) return BadRequest(new { message = "Lớp học không tồn tại." });
		if (!cls.IsOpenForRegistration) return BadRequest(new { message = "Lớp học này hiện không mở đăng ký." });

		var isAlreadyRegistered = await db.StudentClasses.AnyAsync(sc =>
			sc.StudentId == req.StudentId && sc.ClassId == req.ClassId && sc.Status != "Dropped" && sc.Status != "Rejected");
		if (isAlreadyRegistered)
			return Conflict(new { message = "Học viên đã đăng ký lớp học này rồi." });

		// Phụ huynh đăng ký thì chờ duyệt, Nhân viên đăng ký thì duyệt luôn
		var isApproved = IsStaff;

		var studentClass = new StudentClass
		{
			StudentId = req.StudentId,
			ClassId = req.ClassId,
			Status = isApproved ? "Active" : "Pending",
			RegisteredAt = DateTime.UtcNow,
			ApprovedBy = isApproved ? UserId : null,
			ApprovedAt = isApproved ? DateTime.UtcNow : null,
			Note = req.Note
		};

		db.StudentClasses.Add(studentClass);
		await db.SaveChangesAsync();

		return Ok(new { message = "Đăng ký thành công!", id = studentClass.Id });
	}

	// API dành cho Admin/BranchManager duyệt hoặc từ chối đăng ký
	[HttpPut("{id}/status")]
	[Authorize(Roles = "SuperAdmin,BranchManager")]
	public async Task<IActionResult> UpdateStatus(int id, UpdateStudentClassStatusRequest req)
	{
		var sc = await db.StudentClasses.Include(s => s.Class).FirstOrDefaultAsync(s => s.Id == id);
		if (sc == null) return NotFound(new { message = "Không tìm thấy thông tin đăng ký." });

		if (Role == "BranchManager" && sc.Class.BranchId != User.GetBranchId())
			return StatusCode(StatusCodes.Status403Forbidden, new { message = "Không có quyền thao tác trên lớp của cơ sở khác." });

		sc.Status = req.Status;
		sc.Note = req.Note;

		// Nếu chuyển sang Active (Duyệt)
		if (req.Status == "Active" && sc.ApprovedBy == null)
		{
			sc.ApprovedBy = UserId;
			sc.ApprovedAt = DateTime.UtcNow;
		}

		await db.SaveChangesAsync();
		return NoContent();
	}
}