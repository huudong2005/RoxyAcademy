using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
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

    /// <summary>
    /// Danh sách đơn xin nghỉ phép (hỗ trợ lọc theo học viên, lớp, chi nhánh, trạng thái, ngày).
    /// Phân quyền 5 vai trò:
    /// - SuperAdmin: Xem toàn bộ.
    /// - BranchManager: Xem đơn thuộc chi nhánh mình (học viên, lớp, hoặc giáo viên thuộc chi nhánh).
    /// - Teacher: Đơn do chính mình tạo + đơn của học viên trong các lớp mình giảng dạy.
    /// - Parent: Đơn của các con mình.
    /// - Student: Đơn của chính mình.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<LeaveRequestDto>>> GetLeaveRequests(
        [FromQuery] int? studentId,
        [FromQuery] int? classId,
        [FromQuery] int? branchId,
        [FromQuery] string? status,
        [FromQuery] DateOnly? fromDate,
        [FromQuery] DateOnly? toDate,
        [FromQuery] string? requesterType)
    {
        var q = db.LeaveRequests
            .Include(lr => lr.Student).ThenInclude(s => s!.Branch)
            .Include(lr => lr.User).ThenInclude(u => u!.Branch) // Teacher navigation
            .Include(lr => lr.Class).ThenInclude(c => c!.Branch)
            .Include(lr => lr.RequestedByNavigation)
            .Include(lr => lr.ReviewedByNavigation)
            .AsQueryable();

        // 1. Phân quyền theo vai trò (Scoping)
        if (Role == "Parent")
        {
            q = q.Where(lr => lr.RequesterType == "Student" && lr.Student != null && lr.Student.ParentId == UserId);
        }
        else if (Role == "Student")
        {
            q = q.Where(lr => lr.RequesterType == "Student" && lr.Student != null && (lr.Student.UserId == UserId || lr.RequestedBy == UserId));
        }
        else if (Role == "Teacher")
        {
            // Giáo viên xem đơn của chính mình HOẶC đơn học viên thuộc lớp mình dạy
            q = q.Where(lr =>
                (lr.TeacherId == UserId || (lr.RequesterType == "Teacher" && lr.RequestedBy == UserId)) ||
                (lr.RequesterType == "Student" && lr.Class != null && lr.Class.TeacherId == UserId)
            );
        }
        else if (Role == "BranchManager")
        {
            var userBranchId = User.GetBranchId() ?? -1;
            // Không làm mất đơn GV khi ClassId == null: kiểm tra cả Class, Student và Teacher
            q = q.Where(lr =>
                (lr.Class != null && lr.Class.BranchId == userBranchId) ||
                (lr.Student != null && lr.Student.BranchId == userBranchId) ||
                (lr.User != null && lr.User.BranchId == userBranchId)
            );
        }
        else if (Role != "SuperAdmin")
        {
            return Forbid();
        }

        // 2. Bộ lọc bổ sung (Query filters)
        if (studentId.HasValue)
        {
            q = q.Where(lr => lr.StudentId == studentId.Value);
        }

        if (classId.HasValue)
        {
            q = q.Where(lr => lr.ClassId == classId.Value);
        }

        if (branchId.HasValue)
        {
            if (Role == "BranchManager")
            {
                var userBranchId = User.GetBranchId() ?? -1;
                if (branchId.Value != userBranchId)
                {
                    return Ok(new List<LeaveRequestDto>());
                }
            }
            else
            {
                q = q.Where(lr =>
                    (lr.Class != null && lr.Class.BranchId == branchId.Value) ||
                    (lr.Student != null && lr.Student.BranchId == branchId.Value) ||
                    (lr.User != null && lr.User.BranchId == branchId.Value)
                );
            }
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var s = status.Trim();
            q = q.Where(lr => lr.Status == s);
        }

        if (fromDate.HasValue)
        {
            q = q.Where(lr => lr.LeaveDate >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            q = q.Where(lr => lr.LeaveDate <= toDate.Value);
        }

        if (!string.IsNullOrWhiteSpace(requesterType))
        {
            var rt = requesterType.Trim();
            q = q.Where(lr => lr.RequesterType == rt);
        }

        var list = await q.OrderByDescending(lr => lr.CreatedAt)
            .Select(lr => new LeaveRequestDto(
                lr.Id,
                lr.RequesterType,
                lr.StudentId,
                lr.Student != null ? lr.Student.FullName : null,
                lr.TeacherId,
                lr.User != null ? lr.User.FullName : null,
                lr.ClassId,
                lr.Class != null ? lr.Class.ClassName : null,
                lr.Class != null ? (int?)lr.Class.BranchId : (lr.Student != null ? (int?)lr.Student.BranchId : (lr.User != null ? lr.User.BranchId : null)),
                lr.Class != null && lr.Class.Branch != null ? lr.Class.Branch.BranchName : (lr.Student != null && lr.Student.Branch != null ? lr.Student.Branch.BranchName : (lr.User != null && lr.User.Branch != null ? lr.User.Branch.BranchName : null)),
                lr.ScheduleId,
                lr.LeaveDate,
                lr.Reason,
                lr.Status,
                lr.RequestedBy,
                lr.RequestedByNavigation != null ? lr.RequestedByNavigation.FullName : null,
                lr.ReviewedBy,
                lr.ReviewedByNavigation != null ? lr.ReviewedByNavigation.FullName : null,
                lr.ReviewedAt,
                lr.ReviewNote,
                lr.CreatedAt
            )).ToListAsync();

        return Ok(list);
    }

    /// <summary>
    /// Lấy chi tiết đơn xin nghỉ theo ID.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<LeaveRequestDto>> GetLeaveRequestById(int id)
    {
        var lr = await db.LeaveRequests
            .Include(lr => lr.Student).ThenInclude(s => s!.Branch)
            .Include(lr => lr.User).ThenInclude(u => u!.Branch)
            .Include(lr => lr.Class).ThenInclude(c => c!.Branch)
            .Include(lr => lr.RequestedByNavigation)
            .Include(lr => lr.ReviewedByNavigation)
            .FirstOrDefaultAsync(lr => lr.Id == id);

        if (lr == null)
            return NotFound(new { message = "Không tìm thấy đơn xin nghỉ này." });

        // Phân quyền xem
        if (Role == "Parent")
        {
            if (lr.RequesterType != "Student" || lr.Student?.ParentId != UserId)
                return Forbid();
        }
        else if (Role == "Student")
        {
            if (lr.RequesterType != "Student" || (lr.Student?.UserId != UserId && lr.RequestedBy != UserId))
                return Forbid();
        }
        else if (Role == "Teacher")
        {
            var isOwn = lr.TeacherId == UserId || (lr.RequesterType == "Teacher" && lr.RequestedBy == UserId);
            var isClassTeacher = lr.RequesterType == "Student" && lr.Class != null && lr.Class.TeacherId == UserId;
            if (!isOwn && !isClassTeacher)
                return Forbid();
        }
        else if (Role == "BranchManager")
        {
            var userBranchId = User.GetBranchId() ?? -1;
            var belongsToBranch = (lr.Class != null && lr.Class.BranchId == userBranchId) ||
                                  (lr.Student != null && lr.Student.BranchId == userBranchId) ||
                                  (lr.User != null && lr.User.BranchId == userBranchId);
            if (!belongsToBranch)
                return Forbid();
        }
        else if (Role != "SuperAdmin")
        {
            return Forbid();
        }

        var branchId = lr.Class?.BranchId ?? lr.Student?.BranchId ?? lr.User?.BranchId;
        var branchName = lr.Class?.Branch?.BranchName ?? lr.Student?.Branch?.BranchName ?? lr.User?.Branch?.BranchName;

        return Ok(new LeaveRequestDto(
            lr.Id,
            lr.RequesterType,
            lr.StudentId,
            lr.Student?.FullName,
            lr.TeacherId,
            lr.User?.FullName,
            lr.ClassId,
            lr.Class?.ClassName,
            branchId,
            branchName,
            lr.ScheduleId,
            lr.LeaveDate,
            lr.Reason,
            lr.Status,
            lr.RequestedBy,
            lr.RequestedByNavigation?.FullName,
            lr.ReviewedBy,
            lr.ReviewedByNavigation?.FullName,
            lr.ReviewedAt,
            lr.ReviewNote,
            lr.CreatedAt
        ));
    }

    /// <summary>
    /// Tạo đơn xin nghỉ mới:
    /// - Parent: tạo cho con mình.
    /// - Student: tạo cho chính mình.
    /// - Teacher: tạo đơn cho chính mình (TeacherId = userId).
    /// - SuperAdmin / BranchManager: tạo cho học viên hoặc giáo viên trong chi nhánh.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "SuperAdmin,BranchManager,Teacher,Parent,Student")]
    public async Task<ActionResult<LeaveRequestDto>> CreateLeaveRequest(CreateLeaveRequest req)
    {
        var userBranchId = User.GetBranchId() ?? -1;

        // 1. Xác định RequesterType
        var requesterType = req.RequesterType?.Trim();
        if (string.IsNullOrEmpty(requesterType))
        {
            if (Role is "Parent" or "Student") requesterType = "Student";
            else if (Role == "Teacher") requesterType = "Teacher";
            else if (req.StudentId.HasValue) requesterType = "Student";
            else if (req.TeacherId.HasValue) requesterType = "Teacher";
            else return BadRequest(new { message = "Vui lòng xác định loại đối tượng xin nghỉ (Student hoặc Teacher)." });
        }

        int? studentId = null;
        int? teacherId = null;

        // 2. Kiểm tra nghiệp vụ theo loại người xin nghỉ
        if (requesterType == "Student")
        {
            if (Role == "Teacher")
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Giáo viên chỉ có thể tạo đơn xin nghỉ cho chính mình." });
            }

            if (!req.StudentId.HasValue)
            {
                if (Role == "Student")
                {
                    var studentProfile = await db.Students.FirstOrDefaultAsync(s => s.UserId == UserId);
                    if (studentProfile == null)
                        return BadRequest(new { message = "Tài khoản học viên chưa được liên kết với hồ sơ học sinh." });
                    studentId = studentProfile.Id;
                }
                else
                {
                    return BadRequest(new { message = "Vui lòng chọn học viên (StudentId)." });
                }
            }
            else
            {
                studentId = req.StudentId.Value;
            }

            var student = await db.Students.FindAsync(studentId);
            if (student == null)
                return BadRequest(new { message = "Học viên không tồn tại." });

            if (Role == "Parent" && student.ParentId != UserId)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Chỉ có thể xin nghỉ cho con của mình." });

            if (Role == "Student" && student.UserId != UserId)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Chỉ có thể xin nghỉ cho chính mình." });

            if (Role == "BranchManager" && student.BranchId != userBranchId)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Chỉ có thể tạo đơn cho học viên thuộc chi nhánh của bạn." });
        }
        else if (requesterType == "Teacher")
        {
            if (Role is "Parent" or "Student")
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền tạo đơn xin nghỉ cho giáo viên." });
            }

            if (Role == "Teacher")
            {
                teacherId = UserId;
            }
            else
            {
                if (!req.TeacherId.HasValue)
                    return BadRequest(new { message = "Vui lòng chọn giáo viên (TeacherId)." });

                var teacher = await db.Users.FirstOrDefaultAsync(u => u.Id == req.TeacherId.Value && u.Role == "Teacher");
                if (teacher == null)
                    return BadRequest(new { message = "Giáo viên không tồn tại hoặc không đúng vai trò Teacher." });

                if (Role == "BranchManager" && teacher.BranchId != userBranchId)
                    return StatusCode(StatusCodes.Status403Forbidden, new { message = "Chỉ có thể tạo đơn cho giáo viên thuộc chi nhánh của bạn." });

                teacherId = teacher.Id;
            }
        }
        else
        {
            return BadRequest(new { message = "Loại người xin nghỉ không hợp lệ (chỉ chấp nhận Student hoặc Teacher)." });
        }

        // 3. Xử lý buổi học (Schedule), lớp học (Class) và ngày xin nghỉ (LeaveDate)
        int? classId = null;
        DateOnly leaveDate;

        if (req.ScheduleId.HasValue)
        {
            var schedule = await db.Schedules.Include(s => s.Class).FirstOrDefaultAsync(s => s.Id == req.ScheduleId.Value);
            if (schedule == null)
                return BadRequest(new { message = "Buổi học không tồn tại." });

            if (req.ClassId.HasValue && req.ClassId.Value != schedule.ClassId)
                return BadRequest(new { message = "Buổi học không thuộc lớp học đã chọn." });

            classId = schedule.ClassId;
            leaveDate = req.LeaveDate ?? schedule.StudyDate;
        }
        else
        {
            classId = req.ClassId;
            if (!req.LeaveDate.HasValue)
                return BadRequest(new { message = "Ngày xin nghỉ là bắt buộc khi không chọn buổi học cụ thể." });

            leaveDate = req.LeaveDate.Value;
        }

        // 4. Kiểm tra hợp lệ lớp học và phân công/ghi danh
        if (classId.HasValue)
        {
            var cls = await db.Classes.FindAsync(classId.Value);
            if (cls == null)
                return BadRequest(new { message = "Lớp học không tồn tại." });

            if (Role == "BranchManager" && cls.BranchId != userBranchId)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Lớp học không thuộc chi nhánh của bạn." });

            if (requesterType == "Student")
            {
                var enrolled = await db.StudentClasses.AnyAsync(sc => sc.StudentId == studentId && sc.ClassId == classId.Value);
                if (!enrolled)
                    return BadRequest(new { message = "Học viên chưa đăng ký hoặc không thuộc lớp học này." });
            }
            else if (requesterType == "Teacher" && Role == "Teacher")
            {
                var isClassTeacher = cls.TeacherId == UserId ||
                    await db.Schedules.AnyAsync(s => s.ClassId == classId.Value && s.SubstituteTeacherId == UserId);
                if (!isClassTeacher)
                    return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không phụ trách giảng dạy lớp học này." });
            }
        }

        // 5. Chặn tạo đơn trùng lặp khi đang có đơn chờ duyệt (Pending)
        var duplicateQuery = db.LeaveRequests.Where(lr =>
            lr.Status == "Pending" &&
            lr.RequesterType == requesterType &&
            lr.LeaveDate == leaveDate);

        if (requesterType == "Student")
            duplicateQuery = duplicateQuery.Where(lr => lr.StudentId == studentId);
        else
            duplicateQuery = duplicateQuery.Where(lr => lr.TeacherId == teacherId);

        if (req.ScheduleId.HasValue)
            duplicateQuery = duplicateQuery.Where(lr => lr.ScheduleId == req.ScheduleId.Value);
        else if (classId.HasValue)
            duplicateQuery = duplicateQuery.Where(lr => lr.ClassId == classId.Value);

        if (await duplicateQuery.AnyAsync())
        {
            return BadRequest(new { message = "Bạn đã có đơn xin nghỉ đang chờ duyệt cho thời gian/buổi học này." });
        }

        // 6. Lưu bản ghi LeaveRequest mới
        var leaveRequest = new LeaveRequest
        {
            RequesterType = requesterType,
            StudentId = requesterType == "Student" ? studentId : null,
            TeacherId = requesterType == "Teacher" ? teacherId : null,
            ClassId = classId,
            ScheduleId = req.ScheduleId,
            LeaveDate = leaveDate,
            Reason = req.Reason.Trim(),
            Status = "Pending",
            RequestedBy = UserId,
            CreatedAt = DateTime.UtcNow
        };

        db.LeaveRequests.Add(leaveRequest);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetLeaveRequestById), new { id = leaveRequest.Id }, new
        {
            message = "Gửi đơn xin nghỉ thành công!",
            id = leaveRequest.Id
        });
    }

    /// <summary>
    /// Duyệt (Approved) hoặc Từ chối (Rejected) đơn xin nghỉ:
    /// - Chỉ SuperAdmin và BranchManager (BranchManager kiểm tra chi nhánh cho cả GV khi ClassId == null).
    /// - Khi duyệt đơn của học viên (Approved), tự động tạo hoặc cập nhật bản ghi Attendances với Status = 'ExcusedAbsent' và lưu trạng thái cũ [Prev:...].
    /// - Khi duyệt đơn của giáo viên (Approved), tự động gỡ dạy thay hoặc chuyển buổi học sang 'Cancelled' kèm ghi chú [CẦN GIÁO VIÊN DẠY THAY ...].
    /// </summary>
    [HttpPut("{id}/review")]
    [Authorize(Roles = "SuperAdmin,BranchManager")]
    public async Task<IActionResult> ReviewLeaveRequest(int id, ReviewLeaveRequest req)
    {
        var leave = await db.LeaveRequests
            .Include(lr => lr.Class)
            .Include(lr => lr.Student)
            .Include(lr => lr.User) // Teacher navigation
            .FirstOrDefaultAsync(lr => lr.Id == id);

        if (leave == null)
            return NotFound(new { message = "Không tìm thấy đơn xin nghỉ này." });

        if (leave.Status != "Pending")
            return BadRequest(new { message = "Chỉ có thể duyệt hoặc từ chối đơn đang ở trạng thái Chờ duyệt (Pending)." });

        // Kiểm tra phạm vi chi nhánh cho BranchManager (kể cả đơn GV khi ClassId == null)
        if (Role == "BranchManager")
        {
            var userBranchId = User.GetBranchId() ?? -1;
            var belongsToBranch = (leave.Class != null && leave.Class.BranchId == userBranchId) ||
                                  (leave.Student != null && leave.Student.BranchId == userBranchId) ||
                                  (leave.User != null && leave.User.BranchId == userBranchId);

            if (!belongsToBranch)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền duyệt đơn xin nghỉ của chi nhánh khác." });
            }
        }

        leave.Status = req.Status;
        leave.ReviewNote = !string.IsNullOrWhiteSpace(req.ReviewNote) ? req.ReviewNote.Trim() : req.Note?.Trim();
        leave.ReviewedBy = UserId;
        leave.ReviewedAt = DateTime.UtcNow;

        // 1. LIÊN KẾT ĐIỂM DANH (ExcusedAbsent) KHI ĐƠN HỌC VIÊN ĐƯỢC DUYỆT
        if (req.Status == "Approved" && leave.StudentId.HasValue)
        {
            var studentId = leave.StudentId.Value;
            var targetSchedules = new List<Schedule>();

            if (leave.ScheduleId.HasValue)
            {
                var schedule = await db.Schedules.FirstOrDefaultAsync(s => s.Id == leave.ScheduleId.Value);
                if (schedule != null)
                {
                    // Đảm bảo học viên đang học active lớp của buổi này
                    var isEnrolled = await db.StudentClasses.AnyAsync(sc =>
                        sc.StudentId == studentId &&
                        sc.ClassId == schedule.ClassId &&
                        sc.Status == "Active");

                    if (isEnrolled)
                    {
                        targetSchedules.Add(schedule);
                    }
                }
            }
            else
            {
                // Không chọn buổi cụ thể: tìm các buổi học trong ngày LeaveDate của lớp học viên đang học Active
                var activeClassQuery = db.StudentClasses
                    .Where(sc => sc.StudentId == studentId && sc.Status == "Active");

                if (leave.ClassId.HasValue)
                {
                    activeClassQuery = activeClassQuery.Where(sc => sc.ClassId == leave.ClassId.Value);
                }

                var activeClassIds = await activeClassQuery.Select(sc => sc.ClassId).ToListAsync();

                if (activeClassIds.Count != 0)
                {
                    targetSchedules = await db.Schedules
                        .Where(s => s.StudyDate == leave.LeaveDate && activeClassIds.Contains(s.ClassId))
                        .ToListAsync();
                }
            }

            foreach (var sched in targetSchedules)
            {
                var attendance = await db.Attendances
                    .FirstOrDefaultAsync(a => a.ScheduleId == sched.Id && a.StudentId == studentId);

                var prevStatus = attendance != null ? attendance.Status : "NONE";
                var suffix = $" [Prev:{prevStatus}]";
                var reasonText = !string.IsNullOrWhiteSpace(leave.Reason) ? $": {leave.Reason.Trim()}" : "";
                var prefix = $"Nghỉ phép có phép (Đơn #{leave.Id}{reasonText})";
                var maxPrefixLen = 300 - suffix.Length;
                if (prefix.Length > maxPrefixLen)
                {
                    prefix = prefix.Substring(0, maxPrefixLen - 3) + "...";
                }
                var note = prefix + suffix;

                if (attendance != null)
                {
                    attendance.Status = "ExcusedAbsent";
                    attendance.Note = note;
                    attendance.MarkedBy = UserId;
                    attendance.MarkedAt = DateTime.UtcNow;
                }
                else
                {
                    db.Attendances.Add(new Attendance
                    {
                        ScheduleId = sched.Id,
                        ClassId = sched.ClassId,
                        StudentId = studentId,
                        Status = "ExcusedAbsent",
                        Note = note,
                        MarkedBy = UserId,
                        MarkedAt = DateTime.UtcNow
                    });
                }
            }
        }

        // 2. XỬ LÝ BUỔI HỌC KHI ĐƠN GIÁO VIÊN ĐƯỢC DUYỆT
        if (req.Status == "Approved" && leave.TeacherId.HasValue)
        {
            var teacherId = leave.TeacherId.Value;
            var teacherSchedules = new List<Schedule>();

            if (leave.ScheduleId.HasValue)
            {
                var schedule = await db.Schedules
                    .Include(s => s.Class)
                    .FirstOrDefaultAsync(s => s.Id == leave.ScheduleId.Value);
                if (schedule != null)
                {
                    teacherSchedules.Add(schedule);
                }
            }
            else
            {
                var schedQuery = db.Schedules
                    .Include(s => s.Class)
                    .Where(s => s.StudyDate == leave.LeaveDate &&
                                s.Status == "Scheduled" &&
                                ((s.Class.TeacherId == teacherId && (s.SubstituteTeacherId == null || s.SubstituteTeacherId == teacherId)) ||
                                 s.SubstituteTeacherId == teacherId));

                if (leave.ClassId.HasValue)
                {
                    schedQuery = schedQuery.Where(s => s.ClassId == leave.ClassId.Value);
                }

                teacherSchedules = await schedQuery.ToListAsync();
            }

            var teacherTag = $"[CẦN GIÁO VIÊN DẠY THAY - GV nghỉ phép Đơn #{leave.Id}]";

            foreach (var sched in teacherSchedules)
            {
                if (sched.SubstituteTeacherId == teacherId)
                {
                    sched.SubstituteTeacherId = null;
                }

                if (sched.Status == "Scheduled" && sched.SubstituteTeacherId == null)
                {
                    sched.Status = "Cancelled";
                    if (string.IsNullOrWhiteSpace(sched.Note))
                    {
                        sched.Note = teacherTag;
                    }
                    else if (!sched.Note.Contains(teacherTag))
                    {
                        var existingNote = sched.Note.Trim();
                        var maxExistingLen = 500 - teacherTag.Length - 1;
                        if (existingNote.Length > maxExistingLen)
                        {
                            existingNote = existingNote.Substring(0, maxExistingLen - 3) + "...";
                        }
                        sched.Note = $"{existingNote} {teacherTag}";
                    }
                }
            }
        }

        await db.SaveChangesAsync();

        var approvedMessage = leave.TeacherId.HasValue
            ? "Đã duyệt đơn xin nghỉ của giáo viên và cập nhật trạng thái các buổi học liên quan (Cần giáo viên dạy thay)!"
            : "Đã duyệt đơn xin nghỉ và tự động cập nhật điểm danh (Nghỉ có phép)!";

        return Ok(new
        {
            message = req.Status == "Approved"
                ? approvedMessage
                : "Đã từ chối đơn xin nghỉ thành công!"
        });
    }

    /// <summary>
    /// Hủy đơn xin nghỉ:
    /// - Đơn Pending: Người tạo đơn, SuperAdmin hoặc BranchManager (đúng chi nhánh) đều được hủy.
    /// - Đơn Approved: Chỉ SuperAdmin hoặc BranchManager (đúng chi nhánh) được hủy, bắt buộc nhập lý do, đồng thời tự động hoàn tác điểm danh / buổi học.
    /// </summary>
    [HttpPut("{id}/cancel")]
    public async Task<IActionResult> CancelLeaveRequest(
        int id,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] CancelLeaveRequestDto? req = null)
    {
        var leave = await db.LeaveRequests
            .Include(lr => lr.Class)
            .Include(lr => lr.Student)
            .Include(lr => lr.User)
            .FirstOrDefaultAsync(lr => lr.Id == id);

        if (leave == null)
            return NotFound(new { message = "Không tìm thấy đơn xin nghỉ này." });

        if (leave.Status != "Pending" && leave.Status != "Approved")
        {
            return BadRequest(new { message = "Chỉ có thể hủy đơn đang ở trạng thái Chờ duyệt (Pending) hoặc Đã duyệt (Approved)." });
        }

        // Kiểm tra phạm vi chi nhánh đối với BranchManager
        if (Role == "BranchManager")
        {
            var userBranchId = User.GetBranchId() ?? -1;
            var belongsToBranch = (leave.Class != null && leave.Class.BranchId == userBranchId) ||
                                  (leave.Student != null && leave.Student.BranchId == userBranchId) ||
                                  (leave.User != null && leave.User.BranchId == userBranchId);

            if (!belongsToBranch && leave.RequestedBy != UserId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền hủy đơn xin nghỉ của chi nhánh khác." });
            }
        }

        var cancelReason = !string.IsNullOrWhiteSpace(req?.Reason) ? req.Reason.Trim() : req?.Note?.Trim();

        if (leave.Status == "Pending")
        {
            if (Role is not ("SuperAdmin" or "BranchManager") && leave.RequestedBy != UserId)
            {
                return Forbid();
            }

            if (!string.IsNullOrWhiteSpace(cancelReason))
            {
                var cancelTag = $"[Đã hủy đơn: {cancelReason}]";
                leave.ReviewNote = cancelTag.Length > 500 ? cancelTag.Substring(0, 500) : cancelTag;
            }
        }
        else if (leave.Status == "Approved")
        {
            if (Role is not ("SuperAdmin" or "BranchManager"))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Chỉ Quản lý cơ sở hoặc SuperAdmin mới được hủy đơn xin nghỉ đã duyệt."
                });
            }

            if (Role == "BranchManager")
            {
                var userBranchId = User.GetBranchId() ?? -1;
                var belongsToBranch = (leave.Class != null && leave.Class.BranchId == userBranchId) ||
                                      (leave.Student != null && leave.Student.BranchId == userBranchId) ||
                                      (leave.User != null && leave.User.BranchId == userBranchId);

                if (!belongsToBranch)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền hủy đơn xin nghỉ của chi nhánh khác." });
                }
            }

            if (string.IsNullOrWhiteSpace(cancelReason))
            {
                return BadRequest(new { message = "Vui lòng nhập lý do hủy đơn xin nghỉ đã được phê duyệt." });
            }

            var cancelTag = $"[Đã hủy đơn đã duyệt: {cancelReason}]";
            var combinedNote = string.IsNullOrWhiteSpace(leave.ReviewNote)
                ? cancelTag
                : $"{leave.ReviewNote.Trim()} {cancelTag}";
            leave.ReviewNote = combinedNote.Length > 500 ? combinedNote.Substring(0, 500) : combinedNote;
            leave.ReviewedBy = UserId;
            leave.ReviewedAt = DateTime.UtcNow;

            // 1. Hoàn tác điểm danh của Học viên
            if (leave.StudentId.HasValue)
            {
                var studentId = leave.StudentId.Value;
                var leaveMarker = $"Đơn #{leave.Id}";
                var affectedAttendances = await db.Attendances
                    .Where(a => a.StudentId == studentId &&
                                a.Status == "ExcusedAbsent" &&
                                a.Note != null &&
                                a.Note.Contains(leaveMarker))
                    .ToListAsync();

                var validStatuses = new[] { "Present", "Late", "ExcusedAbsent", "UnexcusedAbsent" };

                foreach (var att in affectedAttendances)
                {
                    var noteStr = att.Note ?? "";
                    string? restoredStatus = null;

                    foreach (var st in validStatuses)
                    {
                        if (noteStr.Contains($"[Prev:{st}]"))
                        {
                            restoredStatus = st;
                            break;
                        }
                    }

                    if (restoredStatus != null)
                    {
                        att.Status = restoredStatus;
                        att.Note = $"Đã hoàn tác đơn nghỉ #{leave.Id}";
                        att.MarkedBy = UserId;
                        att.MarkedAt = DateTime.UtcNow;
                    }
                    else
                    {
                        // [Prev:NONE] hoặc không có [Prev:...] -> xóa bản ghi để về trạng thái chưa điểm danh
                        db.Attendances.Remove(att);
                    }
                }
            }

            // 2. Hoàn tác buổi học của Giáo viên
            if (leave.TeacherId.HasValue)
            {
                var leaveMarker = $"Đơn #{leave.Id}";
                var teacherTag = $"[CẦN GIÁO VIÊN DẠY THAY - GV nghỉ phép Đơn #{leave.Id}]";
                var affectedSchedules = await db.Schedules
                    .Where(s => s.Note != null && s.Note.Contains(leaveMarker))
                    .ToListAsync();

                foreach (var sched in affectedSchedules)
                {
                    if (sched.Status == "Cancelled")
                    {
                        sched.Status = "Scheduled";
                    }

                    if (sched.Note != null)
                    {
                        var cleanedNote = sched.Note.Replace(teacherTag, "").Trim();
                        sched.Note = string.IsNullOrWhiteSpace(cleanedNote) ? null : cleanedNote;
                    }
                }
            }
        }

        leave.Status = "Cancelled";
        await db.SaveChangesAsync();

        return Ok(new { message = "Đã hủy đơn xin nghỉ thành công." });
    }
}
