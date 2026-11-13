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
public class HomeworksController(RoxyDbContext db) : ControllerBase
{
    private string Role => User.GetRole();
    private int UserId => User.GetUserId();

    [HttpGet]
    public async Task<ActionResult<IEnumerable<HomeworkDto>>> GetHomeworks([FromQuery] int classId)
    {
        var q = db.Homeworks
            .Include(h => h.Class)
            .Include(h => h.CreatedByNavigation)
            .Where(h => h.ClassId == classId);

        var list = await q.OrderByDescending(h => h.CreatedAt)
            .Select(h => new HomeworkDto(
                h.Id, h.ClassId, h.Class!.ClassName, h.ScheduleId, h.Title, h.Description,
                h.AttachmentUrl, h.DueDate, h.CreatedBy, h.CreatedByNavigation!.FullName, h.CreatedAt
            )).ToListAsync();

        return Ok(list);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]
    public async Task<ActionResult<HomeworkDto>> CreateHomework(CreateHomeworkRequest req)
    {
        var cls = await db.Classes.FindAsync(req.ClassId);
        if (cls == null) return BadRequest(new { message = "Lớp học không tồn tại." });

        if (Role == "Teacher" && cls.TeacherId != UserId)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không phụ trách lớp này." });

        // 1. Tạo Đề bài (Homework)
        var homework = new Homework
        {
            ClassId = req.ClassId,
            ScheduleId = req.ScheduleId,
            Title = req.Title.Trim(),
            Description = req.Description,
            AttachmentUrl = req.AttachmentUrl,
            DueDate = req.DueDate,
            CreatedBy = UserId,
            CreatedAt = DateTime.UtcNow
        };
        db.Homeworks.Add(homework);
        await db.SaveChangesAsync(); // Lưu để lấy ID của Homework

        // 2. Tự động tạo "Chỗ nộp bài" (Submission) cho tất cả học viên ĐANG HỌC trong lớp
        var enrolledStudents = await db.StudentClasses
            .Where(sc => sc.ClassId == req.ClassId && sc.Status == "Active")
            .ToListAsync();

        foreach (var sc in enrolledStudents)
        {
            db.HomeworkSubmissions.Add(new HomeworkSubmission
            {
                HomeworkId = homework.Id,
                ClassId = req.ClassId,
                StudentId = sc.StudentId,
                Status = "Pending" // Mặc định chưa nộp
            });
        }
        await db.SaveChangesAsync();

        return Ok(new { message = "Tạo bài tập thành công và đã giao cho học viên!", id = homework.Id });
    }
}