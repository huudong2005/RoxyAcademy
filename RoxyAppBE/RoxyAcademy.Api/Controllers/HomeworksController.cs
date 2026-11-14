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
    public async Task<ActionResult<IEnumerable<HomeworkDto>>> GetHomeworks(
        [FromQuery] int? classId = null,
        [FromQuery] int? scheduleId = null,
        [FromQuery] int? branchId = null,
        [FromQuery] string? status = null,
        [FromQuery] DateTime? dueDateFrom = null,
        [FromQuery] DateTime? dueDateTo = null)
    {
        var q = db.Homeworks
            .Include(h => h.Class).ThenInclude(c => c.Branch)
            .Include(h => h.CreatedByNavigation)
            .Include(h => h.Schedule)
            .Include(h => h.HomeworkSubmissions)
            .AsQueryable();

        // 1. Phân quyền theo vai trò (Role-based scope)
        switch (Role)
        {
            case "SuperAdmin":
                break;

            case "BranchManager":
                var userBranchId = User.GetBranchId() ?? -1;
                q = q.Where(h => h.Class.BranchId == userBranchId);
                break;

            case "Teacher":
                q = q.Where(h => h.Class.TeacherId == UserId
                    || (h.ScheduleId != null && h.Schedule!.SubstituteTeacherId == UserId)
                    || db.Schedules.Any(s => s.ClassId == h.ClassId && s.SubstituteTeacherId == UserId));
                break;

            case "Parent":
                q = q.Where(h => db.StudentClasses.Any(sc =>
                    sc.ClassId == h.ClassId &&
                    sc.Status == "Active" &&
                    sc.Student.ParentId == UserId));
                break;

            case "Student":
                q = q.Where(h => db.StudentClasses.Any(sc =>
                    sc.ClassId == h.ClassId &&
                    sc.Status == "Active" &&
                    sc.Student.UserId == UserId));
                break;

            default:
                return Forbid();
        }

        // 2. Bộ lọc động theo tham số query
        if (classId.HasValue)
        {
            q = q.Where(h => h.ClassId == classId.Value);
        }

        if (scheduleId.HasValue)
        {
            q = q.Where(h => h.ScheduleId == scheduleId.Value);
        }

        if (branchId.HasValue && Role != "BranchManager")
        {
            q = q.Where(h => h.Class.BranchId == branchId.Value);
        }

        if (dueDateFrom.HasValue)
        {
            q = q.Where(h => h.DueDate >= dueDateFrom.Value);
        }

        if (dueDateTo.HasValue)
        {
            q = q.Where(h => h.DueDate <= dueDateTo.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var st = status.Trim().ToLowerInvariant();
            var now = DateTime.UtcNow;
            if (st is "active" or "ongoing" or "open")
            {
                q = q.Where(h => h.DueDate == null || h.DueDate >= now);
            }
            else if (st is "overdue" or "expired")
            {
                q = q.Where(h => h.DueDate != null && h.DueDate < now);
            }
        }

        var list = await q.OrderByDescending(h => h.CreatedAt)
            .Select(h => new HomeworkDto(
                h.Id,
                h.ClassId,
                h.Class.ClassName,
                h.ScheduleId,
                h.Title,
                h.Description,
                h.AttachmentUrl,
                h.DueDate,
                h.CreatedBy,
                h.CreatedByNavigation.FullName,
                h.CreatedAt,
                h.Class.BranchId,
                h.Class.Branch.BranchName,
                h.HomeworkSubmissions.Count,
                h.HomeworkSubmissions.Count(s => s.Status == "Submitted" || s.Status == "Reviewed"),
                h.HomeworkSubmissions.Count(s => s.Status == "Reviewed")
            ))
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<HomeworkDto>> GetHomeworkById(int id)
    {
        var h = await db.Homeworks
            .Include(h => h.Class).ThenInclude(c => c.Branch)
            .Include(h => h.CreatedByNavigation)
            .Include(h => h.Schedule)
            .Include(h => h.HomeworkSubmissions)
            .FirstOrDefaultAsync(h => h.Id == id);

        if (h == null)
            return NotFound(new { message = "Không tìm thấy bài tập." });

        // Phân quyền xem
        switch (Role)
        {
            case "SuperAdmin":
                break;

            case "BranchManager":
                var userBranchId = User.GetBranchId() ?? -1;
                if (h.Class.BranchId != userBranchId)
                    return Forbid();
                break;

            case "Teacher":
                bool isTeacher = h.Class.TeacherId == UserId
                    || (h.ScheduleId != null && h.Schedule?.SubstituteTeacherId == UserId)
                    || await db.Schedules.AnyAsync(s => s.ClassId == h.ClassId && s.SubstituteTeacherId == UserId);
                if (!isTeacher)
                    return Forbid();
                break;

            case "Parent":
                bool hasChild = await db.StudentClasses.AnyAsync(sc =>
                    sc.ClassId == h.ClassId &&
                    sc.Status == "Active" &&
                    sc.Student.ParentId == UserId);
                if (!hasChild)
                    return Forbid();
                break;

            case "Student":
                bool isEnrolled = await db.StudentClasses.AnyAsync(sc =>
                    sc.ClassId == h.ClassId &&
                    sc.Status == "Active" &&
                    sc.Student.UserId == UserId);
                if (!isEnrolled)
                    return Forbid();
                break;

            default:
                return Forbid();
        }

        var dto = new HomeworkDto(
            h.Id,
            h.ClassId,
            h.Class.ClassName,
            h.ScheduleId,
            h.Title,
            h.Description,
            h.AttachmentUrl,
            h.DueDate,
            h.CreatedBy,
            h.CreatedByNavigation.FullName,
            h.CreatedAt,
            h.Class.BranchId,
            h.Class.Branch.BranchName,
            h.HomeworkSubmissions.Count,
            h.HomeworkSubmissions.Count(s => s.Status == "Submitted" || s.Status == "Reviewed"),
            h.HomeworkSubmissions.Count(s => s.Status == "Reviewed")
        );

        return Ok(dto);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]
    public async Task<ActionResult> CreateHomework(CreateHomeworkRequest req)
    {
        var cls = await db.Classes.FindAsync(req.ClassId);
        if (cls == null)
            return BadRequest(new { message = "Lớp học không tồn tại." });

        if (Role == "BranchManager")
        {
            var userBranchId = User.GetBranchId() ?? -1;
            if (cls.BranchId != userBranchId)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền giao bài tập cho lớp thuộc chi nhánh khác." });
        }
        else if (Role == "Teacher")
        {
            bool isTeacherOfClass = cls.TeacherId == UserId;
            if (!isTeacherOfClass && req.ScheduleId.HasValue)
            {
                isTeacherOfClass = await db.Schedules.AnyAsync(s => s.Id == req.ScheduleId.Value && s.ClassId == req.ClassId && s.SubstituteTeacherId == UserId);
            }
            if (!isTeacherOfClass)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không phụ trách lớp hoặc buổi học này." });
            }
        }

        if (req.ScheduleId.HasValue)
        {
            var schedule = await db.Schedules.FindAsync(req.ScheduleId.Value);
            if (schedule == null || schedule.ClassId != req.ClassId)
                return BadRequest(new { message = "Buổi học không tồn tại hoặc không thuộc lớp học này." });
        }

        // 1. Tạo Đề bài (Homework)
        var homework = new Homework
        {
            ClassId = req.ClassId,
            ScheduleId = req.ScheduleId,
            Title = req.Title.Trim(),
            Description = req.Description?.Trim(),
            AttachmentUrl = req.AttachmentUrl?.Trim(),
            DueDate = req.DueDate,
            CreatedBy = UserId,
            CreatedAt = DateTime.UtcNow
        };
        db.Homeworks.Add(homework);
        await db.SaveChangesAsync();

        // 2. Tự động tạo "Chỗ nộp bài" (Submission) cho tất cả học viên ĐANG HỌC trong lớp
        var enrolledStudents = await db.StudentClasses
            .Where(sc => sc.ClassId == req.ClassId && sc.Status == "Active")
            .Select(sc => sc.StudentId)
            .Distinct()
            .ToListAsync();

        foreach (var studentId in enrolledStudents)
        {
            db.HomeworkSubmissions.Add(new HomeworkSubmission
            {
                HomeworkId = homework.Id,
                ClassId = req.ClassId,
                StudentId = studentId,
                Status = "Pending"
            });
        }
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetHomeworkById), new { id = homework.Id }, new
        {
            message = "Tạo bài tập thành công và đã giao cho học viên!",
            id = homework.Id
        });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]
    public async Task<IActionResult> UpdateHomework(int id, UpdateHomeworkRequest req)
    {
        var homework = await db.Homeworks
            .Include(h => h.Class)
            .FirstOrDefaultAsync(h => h.Id == id);

        if (homework == null)
            return NotFound(new { message = "Không tìm thấy bài tập." });

        if (Role == "BranchManager")
        {
            var userBranchId = User.GetBranchId() ?? -1;
            if (homework.Class.BranchId != userBranchId)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền sửa bài tập của chi nhánh khác." });
        }
        else if (Role == "Teacher")
        {
            bool isAuthorizedTeacher = homework.Class.TeacherId == UserId || homework.CreatedBy == UserId;
            if (!isAuthorizedTeacher && homework.ScheduleId.HasValue)
            {
                isAuthorizedTeacher = await db.Schedules.AnyAsync(s => s.Id == homework.ScheduleId.Value && s.SubstituteTeacherId == UserId);
            }
            if (!isAuthorizedTeacher)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền chỉnh sửa bài tập này." });
        }

        if (req.ScheduleId.HasValue)
        {
            var schedule = await db.Schedules.FindAsync(req.ScheduleId.Value);
            if (schedule == null || schedule.ClassId != homework.ClassId)
                return BadRequest(new { message = "Buổi học không tồn tại hoặc không thuộc lớp học này." });
        }

        homework.Title = req.Title.Trim();
        homework.Description = req.Description?.Trim();
        homework.AttachmentUrl = req.AttachmentUrl?.Trim();
        homework.DueDate = req.DueDate;
        homework.ScheduleId = req.ScheduleId;

        await db.SaveChangesAsync();

        return Ok(new { message = "Cập nhật bài tập thành công!", id = homework.Id });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]
    public async Task<IActionResult> DeleteHomework(int id)
    {
        var homework = await db.Homeworks
            .Include(h => h.Class)
            .FirstOrDefaultAsync(h => h.Id == id);

        if (homework == null)
            return NotFound(new { message = "Không tìm thấy bài tập." });

        if (Role == "BranchManager")
        {
            var userBranchId = User.GetBranchId() ?? -1;
            if (homework.Class.BranchId != userBranchId)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền xóa bài tập của chi nhánh khác." });
        }
        else if (Role == "Teacher")
        {
            bool isAuthorizedTeacher = homework.Class.TeacherId == UserId || homework.CreatedBy == UserId;
            if (!isAuthorizedTeacher)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền xóa bài tập này." });
        }

        // Xóa an toàn toàn bộ bài nộp trước để tránh xung đột khóa ngoại
        var submissions = await db.HomeworkSubmissions.Where(s => s.HomeworkId == id).ToListAsync();
        if (submissions.Count > 0)
        {
            db.HomeworkSubmissions.RemoveRange(submissions);
        }

        db.Homeworks.Remove(homework);
        await db.SaveChangesAsync();

        return Ok(new { message = "Xóa bài tập thành công!" });
    }
}
