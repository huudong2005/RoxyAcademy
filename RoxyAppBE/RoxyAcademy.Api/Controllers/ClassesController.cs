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
public class ClassesController(RoxyDbContext db) : ControllerBase
{
    private string Role => User.GetRole();
    private int UserId => User.GetUserId();

    private IQueryable<Class> VisibleClasses()
    {
        var q = db.Classes.AsQueryable();

        switch (Role)
        {
            case "SuperAdmin":
                return q;
            case "BranchManager":
                var branchId = User.GetBranchId() ?? -1;
                return q.Where(c => c.BranchId == branchId);
            case "Teacher":
                return q.Where(c => c.TeacherId == UserId);
            case "Parent":
                return q.Where(c => db.StudentClasses.Any(sc => sc.ClassId == c.Id && sc.Student!.ParentId == UserId));
            case "Student":
                return q.Where(c => db.StudentClasses.Any(sc => sc.ClassId == c.Id && sc.Student!.UserId == UserId));
            default:
                return q.Where(_ => false);
        }
    }

    private Task<List<ClassDto>> ToClassDtosAsync(IQueryable<Class> query)
    {
        return query
            .Include(c => c.Course)
            .Include(c => c.Branch)
            .Include(c => c.User)
            .Select(c => new ClassDto(
                c.Id, c.ClassName,
                c.CourseId, c.Course.CourseName,
                c.TeacherId, c.User != null ? c.User.FullName : null,
                c.BranchId, c.Branch.BranchName,
                c.ClassType, c.MaxStudents, c.StartDate, c.EndDate,
                c.TuitionFee, c.IsOpenForRegistration, c.Status, c.Note, c.CreatedAt,
                db.StudentClasses.Count(sc => sc.ClassId == c.Id && sc.Status == "Active")))
            .ToListAsync();
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ClassDto>>> GetClasses()
    {
        var classes = await ToClassDtosAsync(VisibleClasses());
        return Ok(classes);
    }

    [HttpGet("open-for-registration")]
    [Authorize(Roles = "SuperAdmin,BranchManager,Parent")]
    public async Task<ActionResult<IEnumerable<ClassDto>>> GetOpenForRegistrationClasses()
    {
        var q = db.Classes.Where(c => c.IsOpenForRegistration && c.Status != "Finished");

        if (Role == "BranchManager")
        {
            var branchId = User.GetBranchId() ?? -1;
            q = q.Where(c => c.BranchId == branchId);
        }
        else if (Role == "Parent")
        {
            q = q.Where(c => db.Students.Any(s =>
                s.ParentId == UserId && s.Status != "Dropped" && s.BranchId == c.BranchId));
        }

        var classes = await ToClassDtosAsync(q);
        return Ok(classes);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ClassDto>> GetClass(int id)
    {
        var c = await VisibleClasses()
            .Include(cls => cls.Course)
            .Include(cls => cls.Branch)
            .Include(cls => cls.User)
            .FirstOrDefaultAsync(cls => cls.Id == id);

        if (c == null) return NotFound(new { message = "Không tìm thấy lớp học này." });

        var activeStudentsCount = await db.StudentClasses
            .CountAsync(sc => sc.ClassId == c.Id && sc.Status == "Active");

        return Ok(new ClassDto(
            c.Id, c.ClassName,
            c.CourseId, c.Course.CourseName,
            c.TeacherId, c.User != null ? c.User.FullName : null,
            c.BranchId, c.Branch.BranchName,
            c.ClassType, c.MaxStudents, c.StartDate, c.EndDate,
            c.TuitionFee, c.IsOpenForRegistration, c.Status, c.Note, c.CreatedAt,
            activeStudentsCount));
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<ClassDto>> CreateClass(CreateClassRequest req)
    {
        if (await db.Classes.AnyAsync(c => c.ClassName == req.ClassName))
            return Conflict(new { message = "Tên lớp học đã tồn tại!" });

        var course = await db.Courses.FindAsync(req.CourseId);
        if (course == null)
            return BadRequest(new { message = "Khóa học không tồn tại." });
        if (!course.IsActive)
            return BadRequest(new { message = "Khóa học đã ngừng hoạt động, không thể tạo lớp mới." });

        var branch = await db.Branches.FindAsync(req.BranchId);
        if (branch == null)
            return BadRequest(new { message = "Cơ sở không tồn tại." });
        if (!branch.IsActive)
            return BadRequest(new { message = "Cơ sở đã ngừng hoạt động, không thể tạo lớp mới." });

        // Kiểm tra đúng Role là Teacher và đang hoạt động
        var teacher = await db.Users.FirstOrDefaultAsync(u => u.Id == req.TeacherId && u.Role == "Teacher");
        if (teacher == null)
            return BadRequest(new { message = "Giáo viên không tồn tại hoặc tài khoản không có quyền Giáo viên." });
        if (!teacher.IsActive)
            return BadRequest(new { message = "Không thể phân công giáo viên đang bị khóa tài khoản (IsActive = false)." });

        if (req.StartDate.HasValue && req.EndDate.HasValue && req.EndDate.Value < req.StartDate.Value)
            return BadRequest(new { message = "Ngày kết thúc không được trước ngày bắt đầu." });

        var classType = string.Equals(req.ClassType?.Trim(), "OneToOne", StringComparison.OrdinalIgnoreCase)
            ? "OneToOne"
            : "Group";

        var newClass = new Class
        {
            ClassName = req.ClassName.Trim(),
            CourseId = req.CourseId,
            TeacherId = req.TeacherId,
            BranchId = req.BranchId,
            ClassType = classType,
            MaxStudents = req.MaxStudents,
            StartDate = req.StartDate,
            EndDate = req.EndDate,
            TuitionFee = req.TuitionFee,
            Note = req.Note?.Trim(),
            IsOpenForRegistration = true,
            Status = "Upcoming", // Khớp với ràng buộc CK_Classes_Status
            CreatedAt = DateTime.UtcNow
        };

        db.Classes.Add(newClass);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetClass), new { id = newClass.Id }, null);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateClass(int id, UpdateClassRequest req)
    {
        var cls = await db.Classes.FindAsync(id);
        if (cls == null) return NotFound(new { message = "Không tìm thấy lớp học này." });

        if (req.ClassName != cls.ClassName && await db.Classes.AnyAsync(c => c.ClassName == req.ClassName && c.Id != id))
            return Conflict(new { message = "Tên lớp học đã bị trùng!" });

        var course = await db.Courses.FindAsync(req.CourseId);
        if (course == null)
            return BadRequest(new { message = "Khóa học không tồn tại." });
        if (req.CourseId != cls.CourseId && !course.IsActive)
            return BadRequest(new { message = "Khóa học đã ngừng hoạt động, không thể chuyển lớp sang khóa học này." });

        var branch = await db.Branches.FindAsync(req.BranchId);
        if (branch == null)
            return BadRequest(new { message = "Cơ sở không tồn tại." });
        if (req.BranchId != cls.BranchId && !branch.IsActive)
            return BadRequest(new { message = "Cơ sở đã ngừng hoạt động, không thể chuyển lớp sang cơ sở này." });

        // Không gán giáo viên đã khóa (IsActive == false)
        var teacher = await db.Users.FirstOrDefaultAsync(u => u.Id == req.TeacherId && u.Role == "Teacher");
        if (teacher == null)
            return BadRequest(new { message = "Giáo viên không tồn tại hoặc tài khoản không có quyền Giáo viên." });
        if (!teacher.IsActive)
            return BadRequest(new { message = "Không thể gán giáo viên đã bị khóa tài khoản (IsActive = false)." });

        // Không cho hạ MaxStudents xuống dưới sĩ số hiện tại
        var activeStudentsCount = await db.StudentClasses
            .CountAsync(sc => sc.ClassId == id && sc.Status == "Active");
        if (req.MaxStudents.HasValue && req.MaxStudents.Value < activeStudentsCount)
        {
            return BadRequest(new
            {
                message = $"Không thể hạ sĩ số tối đa ({req.MaxStudents.Value}) xuống dưới sĩ số học viên đang theo học hiện tại ({activeStudentsCount} học viên)."
            });
        }

        // Không đổi Status từ Finished sang Ongoing (hoặc mở lại Upcoming)
        if (cls.Status == "Finished" && req.Status != "Finished")
        {
            return BadRequest(new
            {
                message = "Lớp học đã kết thúc (Finished), không thể chuyển trạng thái quay lại Đang học (Ongoing)."
            });
        }

        // Không đổi học phí của lớp (TuitionFee) khi đã có học phí phát sinh
        if (req.TuitionFee != cls.TuitionFee && await db.Tuitions.AnyAsync(t => t.ClassId == id && !t.IsCancelled))
        {
            return BadRequest(new
            {
                message = "Không thể thay đổi học phí của lớp khi đã có khoản thu học phí phát sinh cho lớp này."
            });
        }

        if (req.StartDate.HasValue && req.EndDate.HasValue && req.EndDate.Value < req.StartDate.Value)
            return BadRequest(new { message = "Ngày kết thúc không được trước ngày bắt đầu." });

        var classType = string.Equals(req.ClassType?.Trim(), "OneToOne", StringComparison.OrdinalIgnoreCase)
            ? "OneToOne"
            : "Group";

        cls.ClassName = req.ClassName.Trim();
        cls.CourseId = req.CourseId;
        cls.TeacherId = req.TeacherId;
        cls.BranchId = req.BranchId;
        cls.ClassType = classType;
        cls.MaxStudents = req.MaxStudents;
        cls.StartDate = req.StartDate;
        cls.EndDate = req.EndDate;
        cls.TuitionFee = req.TuitionFee;
        cls.Note = req.Note?.Trim();
        cls.IsOpenForRegistration = req.IsOpenForRegistration;
        cls.Status = req.Status;
        cls.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> DeleteClass(int id)
    {
        var cls = await db.Classes.FindAsync(id);
        if (cls == null) return NotFound(new { message = "Không tìm thấy lớp học này." });

        var reasons = new List<string>();

        // 1. Còn ghi danh Active
        var activeEnrollmentsCount = await db.StudentClasses
            .CountAsync(sc => sc.ClassId == id && sc.Status == "Active");
        if (activeEnrollmentsCount > 0)
        {
            reasons.Add($"còn {activeEnrollmentsCount} học viên đang theo học (Active)");
        }

        // 2. Còn lịch học tương lai chưa diễn ra
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
        var futureSchedulesCount = await db.Schedules
            .CountAsync(s => s.ClassId == id && s.Status == "Scheduled" && s.StudyDate >= today);
        if (futureSchedulesCount > 0)
        {
            reasons.Add($"còn {futureSchedulesCount} lịch học tương lai chưa diễn ra");
        }

        // 3. Còn bài tập chưa kết thúc hoặc chưa chấm xong
        var nowUtc = DateTime.UtcNow;
        var unfinishedHomeworksCount = await db.Homeworks
            .CountAsync(h => h.ClassId == id && (
                (h.DueDate != null && h.DueDate > nowUtc) ||
                db.HomeworkSubmissions.Any(sub => sub.ClassId == id && sub.HomeworkId == h.Id && sub.Status != "Reviewed")
            ));
        if (unfinishedHomeworksCount > 0)
        {
            reasons.Add($"còn {unfinishedHomeworksCount} bài tập chưa kết thúc hoặc chưa chấm xong");
        }

        // 4. Còn học phí chưa thu đủ
        var unpaidTuitionsCount = await db.Tuitions
            .CountAsync(t => t.ClassId == id && !t.IsCancelled &&
                (t.Payments.Where(p => p.Status == "Confirmed").Sum(p => (decimal?)p.Amount) ?? 0m) < (t.Amount - t.Discount));
        if (unpaidTuitionsCount > 0)
        {
            reasons.Add($"còn {unpaidTuitionsCount} khoản học phí chưa thu đủ");
        }

        if (reasons.Count > 0)
        {
            return BadRequest(new
            {
                message = $"Không thể xóa/đóng lớp học \"{cls.ClassName}\" vì: {string.Join("; ", reasons)}. Vui lòng xử lý hoàn tất trước khi đóng lớp.",
                reasons
            });
        }

        // Xóa mềm: đóng đăng ký, cập nhật trạng thái 'Finished' và ghi nhận UpdatedAt.
        cls.IsOpenForRegistration = false;
        cls.Status = "Finished";
        cls.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return NoContent();
    }
}