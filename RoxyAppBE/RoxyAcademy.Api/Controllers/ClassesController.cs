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

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ClassDto>>> GetClasses()
    {
        var classes = await VisibleClasses()
            .Include(c => c.Course)
            .Include(c => c.Branch)
            .Include(c => c.User)
            .Select(c => new ClassDto(
                c.Id, c.ClassName,
                c.CourseId, c.Course.CourseName,
                c.TeacherId, c.User != null ? c.User.FullName : null,
                c.BranchId, c.Branch.BranchName,
                c.ClassType, c.MaxStudents, c.StartDate, c.EndDate,
                c.TuitionFee, c.IsOpenForRegistration, c.Status, c.Note, c.CreatedAt))
            .ToListAsync();

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

        return Ok(new ClassDto(
            c.Id, c.ClassName,
            c.CourseId, c.Course.CourseName,
            c.TeacherId, c.User != null ? c.User.FullName : null,
            c.BranchId, c.Branch.BranchName,
            c.ClassType, c.MaxStudents, c.StartDate, c.EndDate,
            c.TuitionFee, c.IsOpenForRegistration, c.Status, c.Note, c.CreatedAt));
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<ClassDto>> CreateClass(CreateClassRequest req)
    {
        if (await db.Classes.AnyAsync(c => c.ClassName == req.ClassName))
            return Conflict(new { message = "Tên lớp học đã tồn tại!" });

        if (!await db.Courses.AnyAsync(c => c.Id == req.CourseId))
            return BadRequest(new { message = "Khóa học không tồn tại." });
        if (!await db.Branches.AnyAsync(b => b.Id == req.BranchId))
            return BadRequest(new { message = "Cơ sở không tồn tại." });

        // Kiểm tra đúng Role là Teacher
        if (!await db.Users.AnyAsync(u => u.Id == req.TeacherId && u.Role == "Teacher"))
            return BadRequest(new { message = "Giáo viên không tồn tại hoặc tài khoản không có quyền Giáo viên." });

        var newClass = new Class
        {
            ClassName = req.ClassName,
            CourseId = req.CourseId,
            TeacherId = req.TeacherId,
            BranchId = req.BranchId,
            ClassType = req.ClassType,
            MaxStudents = req.MaxStudents,
            StartDate = req.StartDate,
            EndDate = req.EndDate,
            TuitionFee = req.TuitionFee,
            Note = req.Note,
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

        if (req.ClassName != cls.ClassName && await db.Classes.AnyAsync(c => c.ClassName == req.ClassName))
            return Conflict(new { message = "Tên lớp học đã bị trùng!" });

        cls.ClassName = req.ClassName;
        cls.CourseId = req.CourseId;
        cls.TeacherId = req.TeacherId;
        cls.BranchId = req.BranchId;
        cls.ClassType = req.ClassType;
        cls.MaxStudents = req.MaxStudents;
        cls.StartDate = req.StartDate;
        cls.EndDate = req.EndDate;
        cls.TuitionFee = req.TuitionFee;
        cls.Note = req.Note;
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

        // Xóa mềm: Models/Class.cs không có trường IsActive (chỉ có IsOpenForRegistration, Status, UpdatedAt)
        // và DB có ràng buộc CK_Classes_Status CHECK (Status IN ('Upcoming','Ongoing','Finished')).
        // Thực hiện xóa mềm bằng cách đóng đăng ký, cập nhật trạng thái 'Finished' và ghi nhận UpdatedAt.
        cls.IsOpenForRegistration = false;
        cls.Status = "Finished";
        cls.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return NoContent();
    }
}