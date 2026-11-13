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
public class TuitionsController(RoxyDbContext db) : ControllerBase
{
    private string Role => User.GetRole();
    private int UserId => User.GetUserId();

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TuitionDto>>> GetTuitions([FromQuery] int? studentId, [FromQuery] int? branchId)
    {
        // Giáo viên không được xem học phí
        if (Role == "Teacher")
            return Forbid();

        var q = db.Tuitions
            .Include(t => t.Student)
            .Include(t => t.StudentClass)
                .ThenInclude(sc => sc!.Class) // Join sâu để lấy tên lớp học
            .AsQueryable();

        switch (Role)
        {
            case "SuperAdmin":
                if (branchId.HasValue) q = q.Where(t => t.BranchId == branchId);
                break;
            case "BranchManager":
                var bId = User.GetBranchId() ?? -1;
                q = q.Where(t => t.BranchId == bId);
                break;
            case "Parent":
                q = q.Where(t => t.Student.ParentId == UserId);
                if (branchId.HasValue) q = q.Where(t => t.BranchId == branchId);
                break;
            case "Student":
                q = q.Where(t => t.Student.UserId == UserId);
                if (branchId.HasValue) q = q.Where(t => t.BranchId == branchId);
                break;
            default:
                return Forbid();
        }

        if (studentId.HasValue) q = q.Where(t => t.StudentId == studentId);

        var list = await q.OrderByDescending(t => t.CreatedAt)
            .Select(t => new TuitionDto(
                t.Id, t.StudentId, t.Student.FullName,
                t.ClassId,
                t.StudentClass != null ? t.StudentClass.Class.ClassName : null,
                t.BranchId, t.Title, t.Amount, t.Discount, t.DueDate, t.IsCancelled, t.Note, t.CreatedAt
            )).ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TuitionDto>> GetTuition(int id)
    {
        // Giáo viên không được xem học phí
        if (Role == "Teacher")
            return Forbid();

        var t = await db.Tuitions
            .Include(t => t.Student)
            .Include(t => t.StudentClass).ThenInclude(sc => sc!.Class)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (t == null) return NotFound(new { message = "Không tìm thấy khoản thu này." });

        // Học viên chỉ được xem học phí của chính mình
        if (Role == "Student" && t.Student.UserId != UserId)
            return Forbid();

        // Chặn phụ huynh xem học phí con người khác
        if (Role == "Parent" && t.Student.ParentId != UserId)
            return Forbid();

        // Quản lý cơ sở chỉ được xem học phí cơ sở của mình
        if (Role == "BranchManager" && t.BranchId != (User.GetBranchId() ?? -1))
            return Forbid();

        return Ok(new TuitionDto(
            t.Id, t.StudentId, t.Student.FullName,
            t.ClassId, t.StudentClass != null ? t.StudentClass.Class.ClassName : null,
            t.BranchId, t.Title, t.Amount, t.Discount, t.DueDate, t.IsCancelled, t.Note, t.CreatedAt
        ));
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,BranchManager")]
    public async Task<ActionResult<TuitionDto>> CreateTuition(CreateTuitionRequest req)
    {
        var student = await db.Students.FindAsync(req.StudentId);
        if (student == null) return BadRequest(new { message = "Học viên không tồn tại." });

        if (Role == "BranchManager" && req.BranchId != User.GetBranchId())
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Không thể tạo khoản thu cho cơ sở khác." });

        // THÊM KIỂM TRA: Bắt lỗi FK_Tuitions_Enrolled
        if (req.ClassId.HasValue)
        {
            var isEnrolled = await db.StudentClasses.AnyAsync(sc => sc.StudentId == req.StudentId && sc.ClassId == req.ClassId);
            if (!isEnrolled)
                return BadRequest(new { message = "Học viên chưa ghi danh vào lớp này, không thể tạo hóa đơn học phí." });
        }

        var tuition = new Tuition
        {
            StudentId = req.StudentId,
            ClassId = req.ClassId,
            BranchId = req.BranchId,
            Title = req.Title.Trim(),
            Amount = req.Amount,
            Discount = req.Discount,
            DueDate = req.DueDate,
            IsCancelled = false,
            Note = req.Note,
            CreatedAt = DateTime.UtcNow
        };

        db.Tuitions.Add(tuition);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTuition), new { id = tuition.Id }, null);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin,BranchManager")]
    public async Task<IActionResult> UpdateTuition(int id, UpdateTuitionRequest req)
    {
        var tuition = await db.Tuitions.FindAsync(id);
        if (tuition == null) return NotFound(new { message = "Không tìm thấy khoản thu này." });

        if (Role == "BranchManager" && tuition.BranchId != User.GetBranchId())
            return StatusCode(StatusCodes.Status403Forbidden);

        tuition.Title = req.Title.Trim();
        tuition.Amount = req.Amount;
        tuition.Discount = req.Discount;
        tuition.DueDate = req.DueDate;
        tuition.IsCancelled = req.IsCancelled;
        tuition.Note = req.Note;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> DeleteTuition(int id)
    {
        var tuition = await db.Tuitions.FindAsync(id);
        if (tuition == null) return NotFound(new { message = "Không tìm thấy khoản thu này." });

        // Xóa cứng chỉ dành cho SuperAdmin nếu lỡ tạo sai. 
        // Trong thực tế nếu đã có Payment thì Database sẽ báo lỗi khóa ngoại chặn lại.
        db.Tuitions.Remove(tuition);
        await db.SaveChangesAsync();
        return NoContent();
    }
}