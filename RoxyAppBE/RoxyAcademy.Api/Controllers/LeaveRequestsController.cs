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
public class LeaveRequestsController(RoxyDbContext db) : ControllerBase
{
    private string Role => User.GetRole();
    private int UserId => User.GetUserId();
    private bool IsStaff => Role is "SuperAdmin" or "BranchManager";

    [HttpGet]
    public async Task<ActionResult<IEnumerable<LeaveRequestDto>>> GetLeaveRequests(
        [FromQuery] int? classId,
        [FromQuery] string? requesterType)
    {
        var q = db.LeaveRequests
            .Include(lr => lr.Student)
            .Include(lr => lr.User) // Đây là Teacher mapped qua navigation User
            .Include(lr => lr.Class)
            .Include(lr => lr.RequestedByNavigation)
            .Include(lr => lr.ReviewedByNavigation)
            .AsQueryable();

        // PHÂN QUYỀN XEM
        if (Role == "Parent")
        {
            // Phụ huynh chỉ xem đơn của con mình
            q = q.Where(lr => lr.RequesterType == "Student" && lr.Student!.ParentId == UserId);
        }
        else if (Role == "Student")
        {
            // Học sinh chỉ xem đơn của mình
            q = q.Where(lr => lr.RequesterType == "Student" && lr.Student!.UserId == UserId);
        }
        else if (Role == "Teacher")
        {
            // Giáo viên xem đơn của chính mình HOẶC đơn của học sinh trong lớp mình dạy
            q = q.Where(lr =>
                (lr.RequesterType == "Teacher" && lr.TeacherId == UserId) ||
                (lr.RequesterType == "Student" && lr.Class!.TeacherId == UserId)
            );
        }
        else if (Role == "BranchManager")
        {
            var branchId = User.GetBranchId();
            q = q.Where(lr => lr.Class!.BranchId == branchId);
        }

        if (classId.HasValue) q = q.Where(lr => lr.ClassId == classId);
        if (!string.IsNullOrEmpty(requesterType)) q = q.Where(lr => lr.RequesterType == requesterType);

        var list = await q.OrderByDescending(lr => lr.CreatedAt)
            .Select(lr => new LeaveRequestDto(
                lr.Id, lr.RequesterType,
                lr.StudentId, lr.Student != null ? lr.Student.FullName : null,
                lr.TeacherId, lr.User != null ? lr.User.FullName : null,
                lr.ClassId, lr.Class != null ? lr.Class.ClassName : null,
                lr.ScheduleId, lr.LeaveDate, lr.Reason, lr.Status,
                lr.RequestedBy, lr.RequestedByNavigation!.FullName,
                lr.ReviewedBy, lr.ReviewedByNavigation != null ? lr.ReviewedByNavigation.FullName : null,
                lr.ReviewedAt, lr.ReviewNote, lr.CreatedAt
            )).ToListAsync();

        return Ok(list);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,BranchManager,Teacher,Parent,Student")]
    public async Task<ActionResult<LeaveRequestDto>> CreateLeaveRequest(CreateLeaveRequest req)
    {
        // 1. Kiểm tra logic nếu Học sinh xin nghỉ
        if (req.RequesterType == "Student")
        {
            if (!req.StudentId.HasValue) return BadRequest(new { message = "Vui lòng cung cấp StudentId." });

            var student = await db.Students.FindAsync(req.StudentId);
            if (student == null) return BadRequest(new { message = "Học viên không tồn tại." });

            if (Role == "Parent" && student.ParentId != UserId)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Chỉ có thể xin nghỉ cho con của mình." });
            if (Role == "Student" && student.UserId != UserId)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Chỉ có thể xin nghỉ cho chính mình." });
        }
        // 2. Kiểm tra logic nếu Giáo viên xin nghỉ
        else if (req.RequesterType == "Teacher")
        {
            if (!req.TeacherId.HasValue) return BadRequest(new { message = "Vui lòng cung cấp TeacherId." });

            if (Role == "Teacher" && req.TeacherId != UserId)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Chỉ có thể xin nghỉ cho chính mình." });
        }

        var leaveRequest = new LeaveRequest
        {
            RequesterType = req.RequesterType,
            StudentId = req.StudentId,
            TeacherId = req.TeacherId,
            ClassId = req.ClassId,
            ScheduleId = req.ScheduleId,
            LeaveDate = req.LeaveDate,
            Reason = req.Reason.Trim(),
            Status = "Pending", // Mặc định là chờ duyệt
            RequestedBy = UserId,
            CreatedAt = DateTime.UtcNow
        };

        db.LeaveRequests.Add(leaveRequest);
        await db.SaveChangesAsync();

        return Ok(new { message = "Gửi đơn xin nghỉ thành công!", id = leaveRequest.Id });
    }

    [HttpPut("{id}/review")]
    [Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]
    public async Task<IActionResult> ReviewLeaveRequest(int id, ReviewLeaveRequest req)
    {
        var leave = await db.LeaveRequests.Include(lr => lr.Class).FirstOrDefaultAsync(lr => lr.Id == id);
        if (leave == null) return NotFound(new { message = "Không tìm thấy đơn xin nghỉ này." });

        if (leave.Status != "Pending")
            return BadRequest(new { message = "Chỉ có thể duyệt đơn đang ở trạng thái Pending." });

        // Logic phân quyền duyệt đơn:
        // Giáo viên CHỈ ĐƯỢC DUYỆT đơn của học sinh lớp mình dạy. Không được duyệt đơn của Giáo viên khác.
        if (Role == "Teacher")
        {
            if (leave.RequesterType == "Teacher" || leave.Class!.TeacherId != UserId)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền duyệt đơn này." });
        }

        leave.Status = req.Status;
        leave.ReviewNote = req.ReviewNote;
        leave.ReviewedBy = UserId;
        leave.ReviewedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new { message = "Đã xử lý đơn xin nghỉ!" });
    }
}