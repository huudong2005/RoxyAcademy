using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoxyAcademy.Api.Data;
using RoxyAcademy.Api.Dtos;
using RoxyAcademy.Api.Extensions;

namespace RoxyAcademy.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class HomeworkSubmissionsController(RoxyDbContext db) : ControllerBase
{
	private string Role => User.GetRole();
	private int UserId => User.GetUserId();

	[HttpGet]
	public async Task<ActionResult<IEnumerable<HomeworkSubmissionDto>>> GetSubmissions([FromQuery] int homeworkId)
	{
		var q = db.HomeworkSubmissions
			.Include(s => s.Homework)
			.Include(s => s.StudentClass).ThenInclude(sc => sc.Student)
			.Where(s => s.HomeworkId == homeworkId);

		// Phụ huynh chỉ xem được bài nộp của con mình
		if (Role == "Parent")
			q = q.Where(s => s.StudentClass!.Student!.ParentId == UserId);

		var list = await q.Select(s => new HomeworkSubmissionDto(
			s.Id, s.HomeworkId, s.ClassId, s.StudentId, s.StudentClass!.Student!.FullName,
			s.Status, s.SubmissionUrl, s.StudentNote, s.SubmittedAt, s.TeacherFeedback, s.ReviewedAt
		)).ToListAsync();

		return Ok(list);
	}

	[HttpPut("{id}/submit")] // API DÀNH CHO PHỤ HUYNH / HỌC VIÊN NỘP BÀI
	[Authorize(Roles = "SuperAdmin,Parent")]
	public async Task<IActionResult> SubmitHomework(int id, SubmitHomeworkRequest req)
	{
		var sub = await db.HomeworkSubmissions
			.Include(s => s.StudentClass).ThenInclude(sc => sc.Student)
			.FirstOrDefaultAsync(s => s.Id == id);

		if (sub == null) return NotFound(new { message = "Không tìm thấy hồ sơ nộp bài." });

		if (Role == "Parent" && sub.StudentClass!.Student!.ParentId != UserId)
			return StatusCode(StatusCodes.Status403Forbidden, new { message = "Chỉ được nộp bài cho con của mình." });

		sub.SubmissionUrl = req.SubmissionUrl;
		sub.StudentNote = req.StudentNote;
		sub.Status = "Submitted"; // Chuyển trạng thái sang Đã nộp
		sub.SubmittedAt = DateTime.UtcNow;

		await db.SaveChangesAsync();
		return Ok(new { message = "Nộp bài thành công!" });
	}

	[HttpPut("{id}/review")] // API DÀNH CHO GIÁO VIÊN CHẤM BÀI
	[Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]
	public async Task<IActionResult> ReviewHomework(int id, ReviewHomeworkRequest req)
	{
		var sub = await db.HomeworkSubmissions.FirstOrDefaultAsync(s => s.Id == id);
		if (sub == null) return NotFound(new { message = "Không tìm thấy hồ sơ nộp bài." });

		sub.Status = req.Status; // Thường là "Evaluated"
		sub.TeacherFeedback = req.TeacherFeedback;
		sub.ReviewedAt = DateTime.UtcNow;

		await db.SaveChangesAsync();
		return Ok(new { message = "Chấm bài thành công!" });
	}
}