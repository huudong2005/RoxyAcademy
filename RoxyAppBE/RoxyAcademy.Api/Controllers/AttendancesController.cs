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

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AttendanceDto>>> GetAttendances([FromQuery] int scheduleId)
    {
        var schedule = await db.Schedules
            .Include(s => s.Class)
            .FirstOrDefaultAsync(s => s.Id == scheduleId);

        if (schedule == null)
            return NotFound(new { message = "Buổi học không tồn tại." });

        // 1. Phân quyền truy cập buổi học
        if (Role == "BranchManager")
        {
            var userBranchId = User.GetBranchId() ?? -1;
            if (schedule.Class.BranchId != userBranchId)
                return Forbid();
        }
        else if (Role == "Teacher")
        {
            if (schedule.Class.TeacherId != UserId && schedule.SubstituteTeacherId != UserId)
                return Forbid();
        }
        else if (Role == "Parent")
        {
            var hasChildInClass = await db.StudentClasses.AnyAsync(sc =>
                sc.ClassId == schedule.ClassId &&
                sc.Status == "Active" &&
                sc.Student.ParentId == UserId);
            if (!hasChildInClass) return Forbid();
        }
        else if (Role == "Student")
        {
            var isStudentInClass = await db.StudentClasses.AnyAsync(sc =>
                sc.ClassId == schedule.ClassId &&
                sc.Status == "Active" &&
                sc.Student.UserId == UserId);
            if (!isStudentInClass) return Forbid();
        }
        else if (Role != "SuperAdmin")
        {
            return Forbid();
        }

        // 2. Lấy danh sách học viên đang học trong lớp (Status = Active)
        var studentClassesQ = db.StudentClasses
            .Include(sc => sc.Student)
            .Where(sc => sc.ClassId == schedule.ClassId && sc.Status == "Active");

        if (Role == "Parent")
        {
            studentClassesQ = studentClassesQ.Where(sc => sc.Student.ParentId == UserId);
        }
        else if (Role == "Student")
        {
            studentClassesQ = studentClassesQ.Where(sc => sc.Student.UserId == UserId);
        }

        var activeEnrollments = await studentClassesQ.ToListAsync();

        // 3. Lấy các bản ghi điểm danh đã lưu trong DB của buổi học này
        var attendancesQ = db.Attendances
            .Include(a => a.StudentClass).ThenInclude(sc => sc.Student)
            .Include(a => a.MarkedByNavigation)
            .Where(a => a.ScheduleId == scheduleId);

        if (Role == "Parent")
        {
            attendancesQ = attendancesQ.Where(a => a.StudentClass.Student.ParentId == UserId);
        }
        else if (Role == "Student")
        {
            attendancesQ = attendancesQ.Where(a => a.StudentClass.Student.UserId == UserId);
        }

        var existingAttendances = await attendancesQ.ToListAsync();
        var attendanceMap = existingAttendances.ToDictionary(a => a.StudentId);

        var result = new List<AttendanceDto>();

        // Duyệt danh sách học viên Active của lớp để trả về đầy đủ (kể cả chưa điểm danh)
        foreach (var sc in activeEnrollments.OrderBy(sc => sc.Student.FullName))
        {
            if (attendanceMap.TryGetValue(sc.StudentId, out var existing))
            {
                result.Add(new AttendanceDto(
                    existing.Id,
                    scheduleId,
                    sc.StudentId,
                    sc.Student.FullName,
                    sc.Student.Gender,
                    sc.Student.Dob,
                    existing.Status,
                    existing.Note,
                    existing.MarkedBy,
                    existing.MarkedByNavigation?.FullName,
                    existing.MarkedAt
                ));
            }
            else
            {
                // Học viên trong lớp nhưng chưa được điểm danh buổi này
                result.Add(new AttendanceDto(
                    null,
                    scheduleId,
                    sc.StudentId,
                    sc.Student.FullName,
                    sc.Student.Gender,
                    sc.Student.Dob,
                    null,
                    null,
                    null,
                    null,
                    null
                ));
            }
        }

        // Bổ sung các bản ghi đã từng điểm danh trước đây nếu học viên hiện không còn Active (tránh thất lạc lịch sử)
        foreach (var existing in existingAttendances)
        {
            if (!activeEnrollments.Any(sc => sc.StudentId == existing.StudentId))
            {
                result.Add(new AttendanceDto(
                    existing.Id,
                    scheduleId,
                    existing.StudentId,
                    existing.StudentClass?.Student?.FullName,
                    existing.StudentClass?.Student?.Gender,
                    existing.StudentClass?.Student?.Dob,
                    existing.Status,
                    existing.Note,
                    existing.MarkedBy,
                    existing.MarkedByNavigation?.FullName,
                    existing.MarkedAt
                ));
            }
        }

        return Ok(result);
    }

    [HttpPost("bulk")]
    [Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]
    public async Task<IActionResult> BulkMarkAttendance(BulkAttendanceRequest req)
    {
        var schedule = await db.Schedules.Include(s => s.Class).FirstOrDefaultAsync(s => s.Id == req.ScheduleId);
        if (schedule == null)
            return BadRequest(new { message = "Buổi học không tồn tại." });

        // Chặn BranchManager điểm danh cho lớp thuộc chi nhánh khác
        if (Role == "BranchManager")
        {
            var userBranchId = User.GetBranchId() ?? -1;
            if (schedule.Class.BranchId != userBranchId)
                return Forbid();
        }

        // Quyền điểm danh của Giáo viên: Giáo viên chính hoặc Giáo viên dạy thay buổi đó
        if (Role == "Teacher" && schedule.Class.TeacherId != UserId && schedule.SubstituteTeacherId != UserId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền điểm danh buổi học này." });
        }

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
            if (!enrolledStudentIds.Contains(record.StudentId))
                continue; // Bỏ qua nếu học viên không có trong danh sách active của lớp

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

        // Tự động chuyển trạng thái buổi học thành Completed sau khi điểm danh (nếu đang là Scheduled)
        if (schedule.Status == "Scheduled")
        {
            schedule.Status = "Completed";
        }

        await db.SaveChangesAsync();
        return Ok(new { message = "Điểm danh thành công!" });
    }
}
