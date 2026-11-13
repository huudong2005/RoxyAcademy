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
public class AttendancesController(RoxyDbContext db) : ControllerBase
{
    private string Role => User.GetRole();
    private int UserId => User.GetUserId();
    private bool IsStaff => Role is "SuperAdmin" or "BranchManager";

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AttendanceDto>>> GetAttendances([FromQuery] int scheduleId)
    {
        var schedule = await db.Schedules.Include(s => s.Class).FirstOrDefaultAsync(s => s.Id == scheduleId);
        if (schedule == null) return NotFound(new { message = "Buổi học không tồn tại." });

        if (Role == "BranchManager" && schedule.Class.BranchId != (User.GetBranchId() ?? -1))
            return Forbid();

        if (Role == "Teacher" && schedule.Class.TeacherId != UserId && schedule.SubstituteTeacherId != UserId)
            return Forbid();

        var q = db.Attendances
            .Include(a => a.StudentClass).ThenInclude(sc => sc.Student)
            .Include(a => a.MarkedByNavigation)
            .Where(a => a.ScheduleId == scheduleId)
            .AsQueryable();

        if (Role == "Parent")
            q = q.Where(a => a.StudentClass.Student.ParentId == UserId);
        else if (Role == "Student")
            q = q.Where(a => a.StudentClass.Student.UserId == UserId);
        else if (Role != "SuperAdmin" && Role != "BranchManager" && Role != "Teacher")
            return Forbid();

        var list = await q.Select(a => new AttendanceDto(
            a.Id, a.ScheduleId, a.StudentId, a.StudentClass.Student.FullName,
            a.Status, a.Note, a.MarkedBy,
            a.MarkedByNavigation != null ? a.MarkedByNavigation.FullName : null,
            a.MarkedAt
        )).ToListAsync();

        return Ok(list);
    }

    [HttpPost("bulk")]
    [Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]
    public async Task<IActionResult> BulkMarkAttendance(BulkAttendanceRequest req)
    {
        var schedule = await db.Schedules.Include(s => s.Class).FirstOrDefaultAsync(s => s.Id == req.ScheduleId);
        if (schedule == null) return BadRequest(new { message = "Buổi học không tồn tại." });

        // Chặn BranchManager điểm danh cho lớp thuộc chi nhánh khác
        if (Role == "BranchManager")
        {
            var userBranchId = User.GetBranchId();
            if (schedule.Class.BranchId != userBranchId)
                return Forbid();
        }

        // Quyền điểm danh của Giáo viên: Giáo viên chính hoặc Giáo viên dạy thay buổi đó
        if (Role == "Teacher" && schedule.Class.TeacherId != UserId && schedule.SubstituteTeacherId != UserId)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền điểm danh buổi học này." });

        // Lấy danh sách học viên hiện đang ở trong lớp (tránh điểm danh cho người đã nghỉ)
        var enrolledStudentIds = await db.StudentClasses
            .Where(sc => sc.ClassId == schedule.ClassId && sc.Status == "Active")
            .Select(sc => sc.StudentId)
            .ToListAsync();

        // Lấy danh sách điểm danh đã có trong DB của buổi này
        var existingAttendances = await db.Attendances
            .Where(a => a.ScheduleId == req.ScheduleId)
            .ToListAsync();

        foreach (var record in req.Records)
        {
            if (!enrolledStudentIds.Contains(record.StudentId)) continue; // Bỏ qua nếu bé không (còn) trong lớp

            var existing = existingAttendances.FirstOrDefault(a => a.StudentId == record.StudentId);
            if (existing != null)
            {
                // Cập nhật nếu đã điểm danh rồi
                existing.Status = record.Status;
                existing.Note = record.Note;
                existing.MarkedBy = UserId;
                existing.MarkedAt = DateTime.UtcNow;
            }
            else
            {
                // Thêm mới nếu chưa điểm danh
                db.Attendances.Add(new Attendance
                {
                    ScheduleId = req.ScheduleId,
                    ClassId = schedule.ClassId,
                    StudentId = record.StudentId,
                    Status = record.Status,
                    Note = record.Note,
                    MarkedBy = UserId,
                    MarkedAt = DateTime.UtcNow
                });
            }
        }

        // Tự động chuyển trạng thái buổi học thành Completed sau khi điểm danh
        if (schedule.Status == "Scheduled")
        {
            schedule.Status = "Completed";
        }

        await db.SaveChangesAsync();
        return Ok(new { message = "Điểm danh thành công!" });
    }
}