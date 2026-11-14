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
public class LessonProgressesController(RoxyDbContext db) : ControllerBase
{
    private string Role => User.GetRole();
    private int UserId => User.GetUserId();

    [HttpGet]
    public async Task<ActionResult<IEnumerable<LessonProgressDto>>> GetProgresses(
        [FromQuery] int? classId = null,
        [FromQuery] int? branchId = null,
        [FromQuery] DateOnly? fromDate = null,
        [FromQuery] DateOnly? toDate = null)
    {
        var q = db.LessonProgresses
            .Include(lp => lp.Class).ThenInclude(c => c.Branch)
            .Include(lp => lp.CreatedByNavigation)
            .Include(lp => lp.Schedule)
            .AsQueryable();

        // 1. Phân quyền dữ liệu xem (Role-based scope)
        switch (Role)
        {
            case "SuperAdmin":
                break;

            case "BranchManager":
                var userBranchId = User.GetBranchId() ?? -1;
                q = q.Where(lp => lp.Class.BranchId == userBranchId);
                break;

            case "Teacher":
                q = q.Where(lp => lp.Class.TeacherId == UserId
                    || (lp.ScheduleId != null && lp.Schedule!.SubstituteTeacherId == UserId)
                    || db.Schedules.Any(s => s.ClassId == lp.ClassId && s.SubstituteTeacherId == UserId));
                break;

            case "Parent":
                q = q.Where(lp => db.StudentClasses.Any(sc =>
                    sc.ClassId == lp.ClassId &&
                    sc.Student.ParentId == UserId &&
                    sc.Status == "Active"));
                break;

            case "Student":
                q = q.Where(lp => db.StudentClasses.Any(sc =>
                    sc.ClassId == lp.ClassId &&
                    sc.Student.UserId == UserId &&
                    sc.Status == "Active"));
                break;

            default:
                return Forbid();
        }

        // 2. Bộ lọc động theo tham số
        if (classId.HasValue)
        {
            q = q.Where(lp => lp.ClassId == classId.Value);
        }

        if (branchId.HasValue && Role != "BranchManager")
        {
            q = q.Where(lp => lp.Class.BranchId == branchId.Value);
        }

        if (fromDate.HasValue)
        {
            q = q.Where(lp => lp.LessonDate >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            q = q.Where(lp => lp.LessonDate <= toDate.Value);
        }

        var list = await q.OrderByDescending(lp => lp.LessonDate).ThenByDescending(lp => lp.CreatedAt)
            .Select(lp => new LessonProgressDto(
                lp.Id,
                lp.ClassId,
                lp.Class.ClassName,
                lp.ScheduleId,
                lp.LessonDate,
                lp.Title,
                lp.Content,
                lp.CreatedBy,
                lp.CreatedByNavigation != null ? lp.CreatedByNavigation.FullName : null,
                lp.CreatedAt,
                lp.UpdatedAt
            ))
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<LessonProgressDto>> GetProgressById(int id)
    {
        var lp = await db.LessonProgresses
            .Include(lp => lp.Class).ThenInclude(c => c.Branch)
            .Include(lp => lp.CreatedByNavigation)
            .Include(lp => lp.Schedule)
            .FirstOrDefaultAsync(lp => lp.Id == id);

        if (lp == null)
            return NotFound(new { message = "Không tìm thấy ghi nhận tiến độ này." });

        // Phân quyền xem
        switch (Role)
        {
            case "SuperAdmin":
                break;

            case "BranchManager":
                var userBranchId = User.GetBranchId() ?? -1;
                if (lp.Class.BranchId != userBranchId)
                    return Forbid();
                break;

            case "Teacher":
                bool isTeacher = lp.Class.TeacherId == UserId
                    || (lp.ScheduleId != null && lp.Schedule?.SubstituteTeacherId == UserId)
                    || await db.Schedules.AnyAsync(s => s.ClassId == lp.ClassId && s.SubstituteTeacherId == UserId);
                if (!isTeacher)
                    return Forbid();
                break;

            case "Parent":
                bool hasChild = await db.StudentClasses.AnyAsync(sc =>
                    sc.ClassId == lp.ClassId &&
                    sc.Student.ParentId == UserId &&
                    sc.Status == "Active");
                if (!hasChild)
                    return Forbid();
                break;

            case "Student":
                bool isEnrolled = await db.StudentClasses.AnyAsync(sc =>
                    sc.ClassId == lp.ClassId &&
                    sc.Student.UserId == UserId &&
                    sc.Status == "Active");
                if (!isEnrolled)
                    return Forbid();
                break;

            default:
                return Forbid();
        }

        var dto = new LessonProgressDto(
            lp.Id,
            lp.ClassId,
            lp.Class.ClassName,
            lp.ScheduleId,
            lp.LessonDate,
            lp.Title,
            lp.Content,
            lp.CreatedBy,
            lp.CreatedByNavigation?.FullName,
            lp.CreatedAt,
            lp.UpdatedAt
        );

        return Ok(dto);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]
    public async Task<ActionResult<LessonProgressDto>> CreateProgress(CreateLessonProgressRequest req)
    {
        var cls = await db.Classes.FindAsync(req.ClassId);
        if (cls == null)
            return BadRequest(new { message = "Lớp học không tồn tại." });

        if (Role == "BranchManager")
        {
            var userBranchId = User.GetBranchId() ?? -1;
            if (cls.BranchId != userBranchId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền ghi nhận tiến độ cho lớp thuộc chi nhánh khác." });
            }
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
            {
                return BadRequest(new { message = "Buổi học không tồn tại hoặc không thuộc lớp học này." });
            }
        }

        var progress = new LessonProgress
        {
            ClassId = req.ClassId,
            ScheduleId = req.ScheduleId,
            LessonDate = req.LessonDate,
            Title = req.Title?.Trim(),
            Content = req.Content.Trim(),
            CreatedBy = UserId,
            CreatedAt = DateTime.UtcNow
        };

        db.LessonProgresses.Add(progress);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetProgressById), new { id = progress.Id }, new
        {
            message = "Ghi nhận tiến độ thành công!",
            id = progress.Id
        });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]
    public async Task<IActionResult> UpdateProgress(int id, UpdateLessonProgressRequest req)
    {
        var progress = await db.LessonProgresses.Include(lp => lp.Class).FirstOrDefaultAsync(lp => lp.Id == id);
        if (progress == null)
            return NotFound(new { message = "Không tìm thấy ghi nhận tiến độ này." });

        if (Role == "BranchManager")
        {
            var userBranchId = User.GetBranchId() ?? -1;
            if (progress.Class.BranchId != userBranchId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền sửa tiến độ của lớp thuộc chi nhánh khác." });
            }
        }
        else if (Role == "Teacher")
        {
            bool isAuthorizedTeacher = progress.Class.TeacherId == UserId || progress.CreatedBy == UserId;
            if (!isAuthorizedTeacher && progress.ScheduleId.HasValue)
            {
                isAuthorizedTeacher = await db.Schedules.AnyAsync(s => s.Id == progress.ScheduleId.Value && s.SubstituteTeacherId == UserId);
            }
            if (!isAuthorizedTeacher)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền chỉnh sửa ghi nhận tiến độ này." });
            }
        }

        if (req.ScheduleId.HasValue)
        {
            var schedule = await db.Schedules.FindAsync(req.ScheduleId.Value);
            if (schedule == null || schedule.ClassId != progress.ClassId)
            {
                return BadRequest(new { message = "Buổi học không tồn tại hoặc không thuộc lớp học này." });
            }
        }

        progress.ScheduleId = req.ScheduleId;
        progress.LessonDate = req.LessonDate;
        progress.Title = req.Title?.Trim();
        progress.Content = req.Content.Trim();
        progress.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new { message = "Cập nhật tiến độ thành công!", id = progress.Id });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]
    public async Task<IActionResult> DeleteProgress(int id)
    {
        var progress = await db.LessonProgresses.Include(lp => lp.Class).FirstOrDefaultAsync(lp => lp.Id == id);
        if (progress == null)
            return NotFound(new { message = "Không tìm thấy ghi nhận tiến độ này." });

        if (Role == "BranchManager")
        {
            var userBranchId = User.GetBranchId() ?? -1;
            if (progress.Class.BranchId != userBranchId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền xóa tiến độ của lớp thuộc chi nhánh khác." });
            }
        }
        else if (Role == "Teacher")
        {
            bool isAuthorizedTeacher = progress.Class.TeacherId == UserId || progress.CreatedBy == UserId;
            if (!isAuthorizedTeacher)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền xóa ghi nhận tiến độ này." });
            }
        }

        db.LessonProgresses.Remove(progress);
        await db.SaveChangesAsync();
        return Ok(new { message = "Xóa tiến độ bài học thành công!" });
    }
}
