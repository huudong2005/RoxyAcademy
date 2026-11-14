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
    public async Task<ActionResult<IEnumerable<HomeworkSubmissionDto>>> GetSubmissions(
        [FromQuery] int? homeworkId = null,
        [FromQuery] int? classId = null,
        [FromQuery] int? studentId = null,
        [FromQuery] string? status = null)
    {
        var q = db.HomeworkSubmissions
            .Include(s => s.Homework).ThenInclude(h => h.Class)
            .Include(s => s.StudentClass).ThenInclude(sc => sc.Student)
            .AsQueryable();

        // 1. Phân quyền dữ liệu theo vai trò (Role-based scope)
        switch (Role)
        {
            case "SuperAdmin":
                break;

            case "BranchManager":
                var userBranchId = User.GetBranchId() ?? -1;
                q = q.Where(s => s.Homework.Class.BranchId == userBranchId);
                break;

            case "Teacher":
                q = q.Where(s => s.Homework.Class.TeacherId == UserId
                    || (s.Homework.ScheduleId != null && s.Homework.Schedule!.SubstituteTeacherId == UserId)
                    || db.Schedules.Any(sc => sc.ClassId == s.Homework.ClassId && sc.SubstituteTeacherId == UserId));
                break;

            case "Parent":
                q = q.Where(s => s.StudentClass.Student.ParentId == UserId);
                break;

            case "Student":
                q = q.Where(s => s.StudentClass.Student.UserId == UserId);
                break;

            default:
                return Forbid();
        }

        // 2. Bộ lọc động theo tham số
        if (homeworkId.HasValue)
        {
            q = q.Where(s => s.HomeworkId == homeworkId.Value);
        }

        if (classId.HasValue)
        {
            q = q.Where(s => s.ClassId == classId.Value);
        }

        if (studentId.HasValue && Role != "Parent" && Role != "Student")
        {
            q = q.Where(s => s.StudentId == studentId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var cleanStatus = status.Trim();
            q = q.Where(s => s.Status == cleanStatus);
        }

        var list = await q.OrderBy(s => s.StudentClass.Student.FullName)
            .Select(s => new HomeworkSubmissionDto(
                s.Id,
                s.HomeworkId,
                s.ClassId,
                s.StudentId,
                s.StudentClass.Student.FullName,
                s.Status,
                s.SubmissionUrl,
                s.StudentNote,
                s.SubmittedAt,
                s.TeacherFeedback,
                s.ReviewedAt,
                s.Homework.Title,
                s.Homework.DueDate,
                s.Score
            ))
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<HomeworkSubmissionDto>> GetSubmissionById(int id)
    {
        var sub = await db.HomeworkSubmissions
            .Include(s => s.Homework).ThenInclude(h => h.Class)
            .Include(s => s.StudentClass).ThenInclude(sc => sc.Student)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (sub == null)
            return NotFound(new { message = "Không tìm thấy hồ sơ nộp bài." });

        // Phân quyền xem
        switch (Role)
        {
            case "SuperAdmin":
                break;

            case "BranchManager":
                var userBranchId = User.GetBranchId() ?? -1;
                if (sub.Homework.Class.BranchId != userBranchId)
                    return Forbid();
                break;

            case "Teacher":
                bool isTeacher = sub.Homework.Class.TeacherId == UserId
                    || (sub.Homework.ScheduleId != null && sub.Homework.Schedule?.SubstituteTeacherId == UserId)
                    || await db.Schedules.AnyAsync(sc => sc.ClassId == sub.Homework.ClassId && sc.SubstituteTeacherId == UserId);
                if (!isTeacher)
                    return Forbid();
                break;

            case "Parent":
                if (sub.StudentClass.Student.ParentId != UserId)
                    return Forbid();
                break;

            case "Student":
                if (sub.StudentClass.Student.UserId != UserId)
                    return Forbid();
                break;

            default:
                return Forbid();
        }

        var dto = new HomeworkSubmissionDto(
            sub.Id,
            sub.HomeworkId,
            sub.ClassId,
            sub.StudentId,
            sub.StudentClass.Student.FullName,
            sub.Status,
            sub.SubmissionUrl,
            sub.StudentNote,
            sub.SubmittedAt,
            sub.TeacherFeedback,
            sub.ReviewedAt,
            sub.Homework.Title,
            sub.Homework.DueDate,
            sub.Score
        );

        return Ok(dto);
    }

    [HttpPut("{id}/submit")] // API DÀNH CHO PHỤ HUYNH / HỌC VIÊN NỘP BÀI
    [Authorize(Roles = "SuperAdmin,Parent,Student")]
    public async Task<IActionResult> SubmitHomework(int id, SubmitHomeworkRequest req)
    {
        var sub = await db.HomeworkSubmissions
            .Include(s => s.StudentClass).ThenInclude(sc => sc.Student)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (sub == null)
            return NotFound(new { message = "Không tìm thấy hồ sơ nộp bài." });

        if (Role == "Parent" && sub.StudentClass.Student.ParentId != UserId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Chỉ được nộp bài cho con của mình." });
        }

        if (Role == "Student" && sub.StudentClass.Student.UserId != UserId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Chỉ được nộp bài tập của chính mình." });
        }

        sub.SubmissionUrl = req.SubmissionUrl?.Trim();
        sub.StudentNote = req.StudentNote?.Trim();
        sub.Status = "Submitted"; // Chuyển trạng thái sang Đã nộp
        sub.SubmittedAt = DateTime.UtcNow;
        sub.Score = null;
        sub.TeacherFeedback = null;
        sub.ReviewedAt = null;

        await db.SaveChangesAsync();
        return Ok(new { message = "Nộp bài thành công!" });
    }

    [HttpPut("{id}/review")] // API DÀNH CHO GIÁO VIÊN / QUẢN LÝ CHẤM BÀI
    [Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]
    public async Task<IActionResult> ReviewHomework(int id, ReviewHomeworkRequest req)
    {
        var sub = await db.HomeworkSubmissions
            .Include(s => s.Homework).ThenInclude(h => h.Class)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (sub == null)
            return NotFound(new { message = "Không tìm thấy hồ sơ nộp bài." });

        if (Role == "BranchManager")
        {
            var userBranchId = User.GetBranchId() ?? -1;
            if (sub.Homework.Class.BranchId != userBranchId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền chấm bài cho lớp thuộc chi nhánh khác." });
            }
        }
        else if (Role == "Teacher")
        {
            bool isTeacherOfClass = sub.Homework.Class.TeacherId == UserId;
            if (!isTeacherOfClass && sub.Homework.ScheduleId.HasValue)
            {
                isTeacherOfClass = await db.Schedules.AnyAsync(s => s.Id == sub.Homework.ScheduleId.Value && s.SubstituteTeacherId == UserId);
            }
            if (!isTeacherOfClass)
            {
                isTeacherOfClass = await db.Schedules.AnyAsync(s => s.ClassId == sub.Homework.ClassId && s.SubstituteTeacherId == UserId);
            }
            if (!isTeacherOfClass)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không phụ trách lớp của bài tập này." });
            }
        }

        // Chuẩn hóa status khớp DB check constraint: ('Pending','Submitted','Reviewed')
        sub.Status = string.Equals(req.Status, "Pending", StringComparison.OrdinalIgnoreCase) ? "Pending" : "Reviewed";
        sub.TeacherFeedback = req.TeacherFeedback?.Trim();
        sub.Score = req.Score;
        sub.ReviewedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new { message = "Chấm bài thành công!", status = sub.Status, score = sub.Score });
    }
}
