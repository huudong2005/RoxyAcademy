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
    public async Task<ActionResult<IEnumerable<ScheduleDto>>> GetSchedules(
        [FromQuery] int? classId = null,
        [FromQuery] int? branchId = null,
        [FromQuery] int? teacherId = null,
        [FromQuery] DateOnly? fromDate = null,
        [FromQuery] DateOnly? toDate = null)
    {
        var q = db.Schedules
            .Include(s => s.Class).ThenInclude(c => c.Branch)
            .Include(s => s.Class).ThenInclude(c => c.User) // Main Teacher
            .Include(s => s.User) // Substitute Teacher
            .AsQueryable();

        // 1. Phân quyền theo vai trò (Role-based scope)
        switch (Role)
        {
            case "SuperAdmin":
                break;

            case "BranchManager":
                var userBranchId = User.GetBranchId() ?? -1;
                q = q.Where(s => s.Class.BranchId == userBranchId);
                break;

            case "Teacher":
                q = q.Where(s => s.Class.TeacherId == UserId || s.SubstituteTeacherId == UserId);
                break;

            case "Parent":
                q = q.Where(s => db.StudentClasses.Any(sc =>
                    sc.ClassId == s.ClassId &&
                    sc.Status == "Active" &&
                    sc.Student.ParentId == UserId));
                break;

            case "Student":
                q = q.Where(s => db.StudentClasses.Any(sc =>
                    sc.ClassId == s.ClassId &&
                    sc.Status == "Active" &&
                    sc.Student.UserId == UserId));
                break;

            default:
                return Forbid();
        }

        // 2. Bộ lọc động theo tham số query
        if (classId.HasValue)
        {
            q = q.Where(s => s.ClassId == classId.Value);
        }

        if (branchId.HasValue && Role != "BranchManager")
        {
            q = q.Where(s => s.Class.BranchId == branchId.Value);
        }

        if (teacherId.HasValue)
        {
            q = q.Where(s => s.Class.TeacherId == teacherId.Value || s.SubstituteTeacherId == teacherId.Value);
        }

        if (fromDate.HasValue)
        {
            q = q.Where(s => s.StudyDate >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            q = q.Where(s => s.StudyDate <= toDate.Value);
        }

        var list = await q
            .OrderBy(s => s.StudyDate)
            .ThenBy(s => s.StartTime)
            .Select(s => new ScheduleDto(
                s.Id,
                s.ClassId,
                s.Class.ClassName,
                s.Class.BranchId,
                s.Class.Branch.BranchName,
                s.Class.TeacherId,
                s.Class.User != null ? s.Class.User.FullName : null,
                s.StudyDate,
                s.StartTime,
                s.EndTime,
                s.Room,
                s.SubstituteTeacherId,
                s.User != null ? s.User.FullName : null,
                s.Status,
                s.Note
            ))
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ScheduleDto>> GetSchedule(int id)
    {
        var s = await db.Schedules
            .Include(s => s.Class).ThenInclude(c => c.Branch)
            .Include(s => s.Class).ThenInclude(c => c.User)
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (s == null)
            return NotFound(new { message = "Không tìm thấy buổi học này." });

        // Phân quyền xem chi tiết
        switch (Role)
        {
            case "SuperAdmin":
                break;

            case "BranchManager":
                var userBranchId = User.GetBranchId() ?? -1;
                if (s.Class.BranchId != userBranchId) return Forbid();
                break;

            case "Teacher":
                if (s.Class.TeacherId != UserId && s.SubstituteTeacherId != UserId) return Forbid();
                break;

            case "Parent":
                var hasStudent = await db.StudentClasses.AnyAsync(sc =>
                    sc.ClassId == s.ClassId &&
                    sc.Status == "Active" &&
                    sc.Student.ParentId == UserId);
                if (!hasStudent) return Forbid();
                break;

            case "Student":
                var isStudent = await db.StudentClasses.AnyAsync(sc =>
                    sc.ClassId == s.ClassId &&
                    sc.Status == "Active" &&
                    sc.Student.UserId == UserId);
                if (!isStudent) return Forbid();
                break;

            default:
                return Forbid();
        }

        return Ok(new ScheduleDto(
            s.Id,
            s.ClassId,
            s.Class.ClassName,
            s.Class.BranchId,
            s.Class.Branch.BranchName,
            s.Class.TeacherId,
            s.Class.User != null ? s.Class.User.FullName : null,
            s.StudyDate,
            s.StartTime,
            s.EndTime,
            s.Room,
            s.SubstituteTeacherId,
            s.User != null ? s.User.FullName : null,
            s.Status,
            s.Note
        ));
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]
    public async Task<ActionResult<ScheduleDto>> CreateSchedule(CreateScheduleRequest req)
    {
        var cls = await db.Classes.FindAsync(req.ClassId);
        if (cls == null)
            return BadRequest(new { message = "Lớp học không tồn tại." });

        if (Role == "BranchManager")
        {
            var userBranchId = User.GetBranchId() ?? -1;
            if (cls.BranchId != userBranchId)
                return Forbid();
        }

        if (Role == "Teacher" && cls.TeacherId != UserId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không phụ trách lớp này." });
        }

        // Lớp phải có giáo viên giảng dạy mới cho xếp lịch
        if (cls.TeacherId <= 0 || !await db.Users.AnyAsync(u => u.Id == cls.TeacherId && u.Role == "Teacher"))
        {
            return BadRequest(new { message = "Lớp học chưa được phân công giáo viên giảng dạy, không thể lên lịch học." });
        }

        if (req.EndTime <= req.StartTime)
        {
            return BadRequest(new { message = "Giờ kết thúc phải sau giờ bắt đầu." });
        }

        if (req.SubstituteTeacherId.HasValue)
        {
            var subTeacher = await db.Users.FirstOrDefaultAsync(u => u.Id == req.SubstituteTeacherId && u.Role == "Teacher");
            if (subTeacher == null)
                return BadRequest(new { message = "Giáo viên dạy thay không tồn tại hoặc không hợp lệ." });
        }

        var schedule = new Schedule
        {
            ClassId = req.ClassId,
            StudyDate = req.StudyDate,
            StartTime = req.StartTime,
            EndTime = req.EndTime,
            Room = req.Room,
            SubstituteTeacherId = req.SubstituteTeacherId,
            Status = "Scheduled",
            Note = req.Note,
            CreatedAt = DateTime.UtcNow
        };

        db.Schedules.Add(schedule);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSchedule), new { id = schedule.Id }, new { message = "Lên lịch thành công", id = schedule.Id });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]
    public async Task<IActionResult> UpdateSchedule(int id, UpdateScheduleRequest req)
    {
        var schedule = await db.Schedules.Include(s => s.Class).FirstOrDefaultAsync(s => s.Id == id);
        if (schedule == null)
            return NotFound(new { message = "Không tìm thấy buổi học này." });

        if (Role == "BranchManager")
        {
            var userBranchId = User.GetBranchId() ?? -1;
            if (schedule.Class.BranchId != userBranchId)
                return Forbid();
        }

        if (Role == "Teacher" && schedule.Class.TeacherId != UserId && schedule.SubstituteTeacherId != UserId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền cập nhật lịch học này." });
        }

        if (req.EndTime <= req.StartTime)
        {
            return BadRequest(new { message = "Giờ kết thúc phải sau giờ bắt đầu." });
        }

        if (req.SubstituteTeacherId.HasValue)
        {
            var subTeacher = await db.Users.FirstOrDefaultAsync(u => u.Id == req.SubstituteTeacherId && u.Role == "Teacher");
            if (subTeacher == null)
                return BadRequest(new { message = "Giáo viên dạy thay không tồn tại hoặc không hợp lệ." });
        }

        schedule.StudyDate = req.StudyDate;
        schedule.StartTime = req.StartTime;
        schedule.EndTime = req.EndTime;
        schedule.Room = req.Room;
        schedule.SubstituteTeacherId = req.SubstituteTeacherId;
        schedule.Status = req.Status;
        schedule.Note = req.Note;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin,BranchManager")]
    public async Task<IActionResult> DeleteSchedule(int id)
    {
        var schedule = await db.Schedules.Include(s => s.Class).FirstOrDefaultAsync(s => s.Id == id);
        if (schedule == null)
            return NotFound(new { message = "Không tìm thấy buổi học này." });

        if (Role == "BranchManager")
        {
            var userBranchId = User.GetBranchId() ?? -1;
            if (schedule.Class.BranchId != userBranchId)
                return Forbid();
        }

        // Kiểm tra an toàn các ràng buộc khóa ngoại (Foreign Keys)
        if (await db.Attendances.AnyAsync(a => a.ScheduleId == id))
        {
            return BadRequest(new { message = "Không thể xóa buổi học đã có dữ liệu điểm danh. Vui lòng chuyển trạng thái sang Đã hủy (Cancelled)." });
        }

        if (await db.LessonProgresses.AnyAsync(lp => lp.ScheduleId == id))
        {
            return BadRequest(new { message = "Không thể xóa buổi học đã gắn tiến độ bài học. Vui lòng xóa hoặc gỡ liên kết bài học trước." });
        }

        if (await db.Homeworks.AnyAsync(h => h.ScheduleId == id))
        {
            return BadRequest(new { message = "Không thể xóa buổi học đã gắn bài tập về nhà. Vui lòng xóa bài tập trước." });
        }

        if (await db.LeaveRequests.AnyAsync(lr => lr.ScheduleId == id))
        {
            return BadRequest(new { message = "Không thể xóa buổi học đã có đơn xin nghỉ phép liên kết." });
        }

        db.Schedules.Remove(schedule);
        await db.SaveChangesAsync();

        return NoContent();
    }
}
