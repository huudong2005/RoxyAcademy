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
    public async Task<ActionResult<IEnumerable<LessonProgressDto>>> GetProgresses([FromQuery] int classId)
    {
        var q = db.LessonProgresses
            .Include(lp => lp.Class)
            .Include(lp => lp.CreatedByNavigation)
            .Where(lp => lp.ClassId == classId)
            .AsQueryable();

        // Phân quyền dữ liệu xem
        if (Role == "Teacher")
        {
            q = q.Where(lp => lp.Class!.TeacherId == UserId);
        }
        else if (Role == "BranchManager")
        {
            var branchId = User.GetBranchId();
            q = q.Where(lp => lp.Class!.BranchId == branchId);
        }
        else if (Role == "Parent")
        {
            // Phụ huynh chỉ xem được nếu con đang học lớp này
            q = q.Where(lp => db.StudentClasses.Any(sc => sc.ClassId == classId && sc.Student!.ParentId == UserId && sc.Status == "Active"));
        }
        else if (Role == "Student")
        {
            // Học sinh chỉ xem được nếu mình đang học lớp này
            q = q.Where(lp => db.StudentClasses.Any(sc => sc.ClassId == classId && sc.Student!.UserId == UserId && sc.Status == "Active"));
        }

        var list = await q.OrderByDescending(lp => lp.LessonDate).ThenByDescending(lp => lp.CreatedAt)
            .Select(lp => new LessonProgressDto(
                lp.Id, lp.ClassId, lp.Class!.ClassName, lp.ScheduleId,
                lp.LessonDate, lp.Title, lp.Content,
                lp.CreatedBy, lp.CreatedByNavigation!.FullName,
                lp.CreatedAt, lp.UpdatedAt
            )).ToListAsync();

        return Ok(list);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]
    public async Task<ActionResult<LessonProgressDto>> CreateProgress(CreateLessonProgressRequest req)
    {
        var cls = await db.Classes.FindAsync(req.ClassId);
        if (cls == null) return BadRequest(new { message = "Lớp học không tồn tại." });

        if (Role == "Teacher" && cls.TeacherId != UserId)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không phụ trách lớp này nên không thể ghi nhận tiến độ." });

        if (req.ScheduleId.HasValue)
        {
            var schedule = await db.Schedules.FindAsync(req.ScheduleId);
            if (schedule == null || schedule.ClassId != req.ClassId)
                return BadRequest(new { message = "Buổi học không tồn tại hoặc không thuộc lớp học này." });
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

        return Ok(new { message = "Ghi nhận tiến độ thành công!", id = progress.Id });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]
    public async Task<IActionResult> UpdateProgress(int id, UpdateLessonProgressRequest req)
    {
        var progress = await db.LessonProgresses.Include(lp => lp.Class).FirstOrDefaultAsync(lp => lp.Id == id);
        if (progress == null) return NotFound(new { message = "Không tìm thấy ghi nhận tiến độ này." });

        if (Role == "Teacher" && progress.Class!.TeacherId != UserId)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không phụ trách lớp này." });

        progress.ScheduleId = req.ScheduleId;
        progress.LessonDate = req.LessonDate;
        progress.Title = req.Title?.Trim();
        progress.Content = req.Content.Trim();
        progress.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]
    public async Task<IActionResult> DeleteProgress(int id)
    {
        var progress = await db.LessonProgresses.Include(lp => lp.Class).FirstOrDefaultAsync(lp => lp.Id == id);
        if (progress == null) return NotFound(new { message = "Không tìm thấy ghi nhận tiến độ này." });

        if (Role == "Teacher" && progress.Class!.TeacherId != UserId)
            return StatusCode(StatusCodes.Status403Forbidden);

        db.LessonProgresses.Remove(progress);
        await db.SaveChangesAsync();
        return NoContent();
    }
}