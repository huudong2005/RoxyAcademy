using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoxyAcademy.Api.Data;
using RoxyAcademy.Api.Dtos;
using RoxyAcademy.Api.Extensions;
using AppUser = RoxyAcademy.Api.Models.User;
using AppStudent = RoxyAcademy.Api.Models.Student;

namespace RoxyAcademy.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class StudentsController(RoxyDbContext db, IPasswordHasher<AppUser> hasher) : ControllerBase
{
    private string Role => User.GetRole();
    private bool IsStaff => Role is "SuperAdmin" or "BranchManager";
    private bool CanSeeNote => Role is "SuperAdmin" or "BranchManager" or "Teacher";

    private static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    private static string? ValidateDob(DateOnly? dob)
    {
        if (dob == null) return null;
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
        if (dob > today) return "Ngày sinh không được ở tương lai.";
        if (dob.Value.Year < 1990) return "Ngày sinh không hợp lệ.";
        return null;
    }

    private IQueryable<AppStudent> VisibleStudents()
    {
        var q = db.Students.AsQueryable();
        var userId = User.GetUserId();

        switch (Role)
        {
            case "SuperAdmin":
                return q;
            case "BranchManager":
                {
                    var branchId = User.GetBranchId() ?? -1;
                    return q.Where(s => s.BranchId == branchId);
                }
            case "Teacher":
                return q.Where(s => db.StudentClasses.Any(sc =>
                    sc.StudentId == s.Id && sc.Status == "Active" &&
                    db.Classes.Any(c => c.Id == sc.ClassId && c.TeacherId == userId)));
            case "Parent":
                return q.Where(s => s.ParentId == userId);
            case "Student":
                return q.Where(s => s.UserId == userId);
            default:
                return q.Where(_ => false);
        }
    }

    private IQueryable<StudentDto> ProjectToDto(IQueryable<AppStudent> q) =>
        q.Select(s => new StudentDto(
            s.Id, s.FullName, s.Dob, s.Gender, // Đã sửa thành s.Dob
            s.ParentId,
            db.Users.Where(u => u.Id == s.ParentId).Select(u => u.FullName).FirstOrDefault(),
            db.Users.Where(u => u.Id == s.ParentId).Select(u => u.PhoneNumber).FirstOrDefault(),
            s.UserId,
            s.BranchId,
            db.Branches.Where(b => b.Id == s.BranchId).Select(b => b.BranchName).FirstOrDefault(),
            s.School, s.Grade, s.Note, s.AvatarUrl, s.Status, s.CreatedAt));

    private StudentDto Mask(StudentDto d) => CanSeeNote ? d : d with { Note = null };

    private async Task<(int? ParentId, string? Error)> ResolveParentAsync(int? requested)
    {
        if (Role == "Parent") return (User.GetUserId(), null);
        if (requested == null) return (null, "Vui lòng chọn phụ huynh.");

        var parents = db.Users.Where(u => u.Id == requested && u.Role == "Parent" && u.IsActive);
        if (Role == "BranchManager")
        {
            var b = User.GetBranchId() ?? -1;
            parents = parents.Where(u => u.BranchId == null || u.BranchId == b ||
                db.Students.Any(s => s.ParentId == u.Id && s.BranchId == b));
        }

        return await parents.AnyAsync()
            ? (requested, null)
            : (null, "Không tìm thấy phụ huynh hợp lệ.");
    }

    private async Task<(int? BranchId, string? Error)> ResolveBranchAsync(int? requested)
    {
        var branchId = Role == "BranchManager" ? User.GetBranchId() : requested;
        if (branchId == null) return (null, "Vui lòng chọn cơ sở.");

        if (!await db.Branches.AnyAsync(b => b.Id == branchId && b.IsActive))
            return (null, "Cơ sở không tồn tại hoặc đã ngừng hoạt động.");

        return (branchId, null);
    }

    private async Task ApplyStatusAsync(AppStudent student, string newStatus)
    {
        if (newStatus == "Dropped")
        {
            await db.StudentClasses
                .Where(sc => sc.StudentId == student.Id && (sc.Status == "Active" || sc.Status == "Pending"))
                .ExecuteUpdateAsync(set => set.SetProperty(sc => sc.Status, "Dropped"));
        }

        if (student.UserId != null)
        {
            var accountActive = newStatus != "Dropped";
            await db.Users
                .Where(u => u.Id == student.UserId)
                .ExecuteUpdateAsync(set => set
                    .SetProperty(u => u.IsActive, accountActive)
                    .SetProperty(u => u.UpdatedAt, (DateTime?)DateTime.UtcNow));
        }

        student.Status = newStatus;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<StudentDto>>> GetStudents([FromQuery] StudentQuery query)
    {
        var q = VisibleStudents();

        if (query.BranchId.HasValue) q = q.Where(s => s.BranchId == query.BranchId);
        if (query.ParentId.HasValue) q = q.Where(s => s.ParentId == query.ParentId);
        if (!string.IsNullOrWhiteSpace(query.Status)) q = q.Where(s => s.Status == query.Status);
        if (query.ClassId.HasValue)
            q = q.Where(s => db.StudentClasses.Any(sc =>
                sc.StudentId == s.Id && sc.ClassId == query.ClassId && sc.Status == "Active"));
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var kw = query.Search.Trim();
            q = q.Where(s => s.FullName.Contains(kw));
        }

        var total = await q.CountAsync();
        var items = await ProjectToDto(
                q.OrderBy(s => s.FullName).ThenBy(s => s.Id)
                 .Skip((query.Page - 1) * query.PageSize)
                 .Take(query.PageSize))
            .ToListAsync();

        return Ok(new PagedResult<StudentDto>(items.Select(Mask).ToList(), total, query.Page, query.PageSize));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<StudentDto>> GetStudent(int id)
    {
        var dto = await ProjectToDto(VisibleStudents().Where(s => s.Id == id)).FirstOrDefaultAsync();
        if (dto == null) return NotFound(new { message = "Không tìm thấy học viên này." });
        return Ok(Mask(dto));
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,BranchManager,Parent")]
    public async Task<ActionResult<StudentDto>> CreateStudent(CreateStudentRequest req)
    {
        var dobError = ValidateDob(req.DOB);
        if (dobError != null) return BadRequest(new { message = dobError });

        var (parentId, parentError) = await ResolveParentAsync(req.ParentId);
        if (parentError != null) return BadRequest(new { message = parentError });

        var (branchId, branchError) = await ResolveBranchAsync(req.BranchId);
        if (branchError != null) return BadRequest(new { message = branchError });

        var name = req.FullName.Trim();
        if (await db.Students.AnyAsync(s =>
                s.ParentId == parentId && s.FullName == name && s.Dob == req.DOB && s.Status != "Dropped")) // Đã sửa s.Dob
            return Conflict(new { message = "Phụ huynh này đã có hồ sơ học viên trùng tên và ngày sinh." });

        var student = new AppStudent
        {
            FullName = name,
            Dob = req.DOB, // Đã sửa thành Dob
            Gender = req.Gender,
            ParentId = parentId!.Value,
            BranchId = branchId!.Value,
            School = Clean(req.School),
            Grade = Clean(req.Grade),
            Note = IsStaff ? Clean(req.Note) : null,
            AvatarUrl = Clean(req.AvatarUrl),
            Status = "Active",
            CreatedAt = DateTime.UtcNow
        };

        db.Students.Add(student);
        await db.SaveChangesAsync();

        var dto = await ProjectToDto(db.Students.Where(s => s.Id == student.Id)).FirstAsync();
        return CreatedAtAction(nameof(GetStudent), new { id = student.Id }, Mask(dto));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin,BranchManager,Parent")]
    public async Task<IActionResult> UpdateStudent(int id, UpdateStudentRequest req)
    {
        var student = await VisibleStudents().FirstOrDefaultAsync(s => s.Id == id);
        if (student == null) return NotFound(new { message = "Không tìm thấy học viên này." });

        var dobError = ValidateDob(req.DOB);
        if (dobError != null) return BadRequest(new { message = dobError });

        await using var tx = await db.Database.BeginTransactionAsync();

        student.FullName = req.FullName.Trim();
        student.Dob = req.DOB; // Đã sửa thành student.Dob
        student.Gender = req.Gender;
        student.School = Clean(req.School);
        student.Grade = Clean(req.Grade);
        student.AvatarUrl = Clean(req.AvatarUrl);

        if (IsStaff)
        {
            student.Note = Clean(req.Note);

            if (Role == "SuperAdmin" && req.BranchId.HasValue && req.BranchId != student.BranchId)
            {
                var (branchId, branchError) = await ResolveBranchAsync(req.BranchId);
                if (branchError != null) return BadRequest(new { message = branchError });

                var enrolled = await db.StudentClasses.AnyAsync(sc =>
                    sc.StudentId == id && (sc.Status == "Active" || sc.Status == "Pending"));
                if (enrolled)
                    return Conflict(new { message = "Học viên đang đăng ký lớp, hãy hủy đăng ký trước khi chuyển cơ sở." });

                student.BranchId = branchId!.Value;
            }

            if (req.Status != null && req.Status != student.Status)
                await ApplyStatusAsync(student, req.Status);
        }

        student.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin,BranchManager")]
    public async Task<IActionResult> DeleteStudent(int id)
    {
        var student = await VisibleStudents().FirstOrDefaultAsync(s => s.Id == id);
        if (student == null) return NotFound(new { message = "Không tìm thấy học viên này." });

        if (student.Status != "Dropped")
        {
            await using var tx = await db.Database.BeginTransactionAsync();
            await ApplyStatusAsync(student, "Dropped");
            student.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            await tx.CommitAsync();
        }

        return NoContent();
    }

    [HttpPost("{id}/account")]
    [Authorize(Roles = "SuperAdmin,BranchManager")]
    public async Task<ActionResult<StudentDto>> CreateAccount(int id, CreateStudentAccountRequest req)
    {
        var student = await VisibleStudents().FirstOrDefaultAsync(s => s.Id == id);
        if (student == null) return NotFound(new { message = "Không tìm thấy học viên này." });

        if (student.UserId != null)
            return Conflict(new { message = "Học viên này đã có tài khoản." });
        if (student.Status == "Dropped")
            return BadRequest(new { message = "Học viên đã ngừng học, không thể tạo tài khoản." });

        var phone = req.PhoneNumber.Trim();
        if (await db.Users.AnyAsync(u => u.PhoneNumber == phone))
            return Conflict(new { message = "Số điện thoại này đã được đăng ký. Mỗi tài khoản cần một số riêng." });

        await using var tx = await db.Database.BeginTransactionAsync();

        var user = new AppUser
        {
            PhoneNumber = phone,
            FullName = student.FullName,
            Role = "Student",
            BranchId = student.BranchId,
            PreferredLanguage = "vi",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        if (!string.IsNullOrEmpty(req.Password))
            user.PasswordHash = hasher.HashPassword(user, req.Password);

        db.Users.Add(user);
        await db.SaveChangesAsync();

        student.UserId = user.Id;
        student.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        var dto = await ProjectToDto(db.Students.Where(s => s.Id == id)).FirstAsync();
        return CreatedAtAction(nameof(GetStudent), new { id }, Mask(dto));
    }

    [HttpPost("{id}/account/reset-password")]
    [Authorize(Roles = "SuperAdmin,BranchManager")]
    public async Task<IActionResult> ResetAccountPassword(int id, ResetPasswordRequest req)
    {
        var student = await VisibleStudents().FirstOrDefaultAsync(s => s.Id == id);
        if (student == null) return NotFound(new { message = "Không tìm thấy học viên này." });
        if (student.UserId == null)
            return BadRequest(new { message = "Học viên này chưa có tài khoản." });

        var user = await db.Users.FirstAsync(u => u.Id == student.UserId);
        user.PasswordHash = hasher.HashPassword(user, req.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return NoContent();
    }
}