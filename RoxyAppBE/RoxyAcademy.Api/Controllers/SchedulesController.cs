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
public class SchedulesController(RoxyDbContext db) : ControllerBase
{
    private string Role => User.GetRole();
    private int UserId => User.GetUserId();

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ScheduleDto>>> GetSchedules([FromQuery] int classId)
    {
        var q = db.Schedules
            .Include(s => s.Class)
            .Include(s => s.User) // Substitute Teacher
            .Where(s => s.ClassId == classId);

        var list = await q.OrderBy(s => s.StudyDate).ThenBy(s => s.StartTime)
            .Select(s => new ScheduleDto(
                s.Id, s.ClassId, s.Class.ClassName, s.StudyDate, s.StartTime, s.EndTime,
                s.Room, s.SubstituteTeacherId, s.User != null ? s.User.FullName : null,
                s.Status, s.Note
            )).ToListAsync();

        return Ok(list);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]
    public async Task<ActionResult<ScheduleDto>> CreateSchedule(CreateScheduleRequest req)
    {
        var cls = await db.Classes.FindAsync(req.ClassId);
        if (cls == null) return BadRequest(new { message = "Lớp học không tồn tại." });

        if (Role == "Teacher" && cls.TeacherId != UserId)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không phụ trách lớp này." });

        if (req.SubstituteTeacherId.HasValue)
        {
            var subTeacher = await db.Users.FirstOrDefaultAsync(u => u.Id == req.SubstituteTeacherId && u.Role == "Teacher");
            if (subTeacher == null) return BadRequest(new { message = "Giáo viên dạy thay không hợp lệ." });
        }

        var schedule = new Schedule
        {
            ClassId = req.ClassId,
            StudyDate = req.StudyDate,
            StartTime = req.StartTime,
            EndTime = req.EndTime,
            Room = req.Room,
            SubstituteTeacherId = req.SubstituteTeacherId,
            Status = "Scheduled", // Mặc định khi mới lên lịch
            Note = req.Note,
            CreatedAt = DateTime.UtcNow
        };

        db.Schedules.Add(schedule);
        await db.SaveChangesAsync();

        return Ok(new { message = "Lên lịch thành công", id = schedule.Id });
    }
}