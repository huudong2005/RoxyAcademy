using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoxyAcademy.Api.Data;
using RoxyAcademy.Api.Dtos;
using RoxyAcademy.Api.Extensions;
using AppUser = RoxyAcademy.Api.Models.User;   // tránh trùng với ControllerBase.User

namespace RoxyAcademy.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "SuperAdmin,BranchManager")]
public class UsersController(RoxyDbContext db, IPasswordHasher<AppUser> hasher) : ControllerBase
{
    private static readonly string[] CreatableRoles = ["BranchManager", "Teacher", "Parent"];

    private bool IsSuperAdmin => User.GetRole() == "SuperAdmin";

    // Phạm vi dữ liệu được nhìn thấy:
    // - SuperAdmin: tất cả
    // - BranchManager: giáo viên của cơ sở mình, và phụ huynh thuộc cơ sở mình hoặc có con học ở cơ sở mình
    private IQueryable<AppUser> VisibleUsers()
    {
        var q = db.Users.AsQueryable();
        if (IsSuperAdmin) return q;

        var branchId = User.GetBranchId() ?? -1;
        return q.Where(u =>
            (u.Role == "Teacher" && u.BranchId == branchId) ||
            (u.Role == "Parent" && (u.BranchId == branchId ||
                db.Students.Any(s => s.ParentId == u.Id && s.BranchId == branchId))));
    }

    private IQueryable<UserDto> ProjectToDto(IQueryable<AppUser> q) =>
        q.Select(u => new UserDto(
            u.Id, u.PhoneNumber, u.FullName, u.Email, u.Role,
            u.BranchId,
            db.Branches.Where(b => b.Id == u.BranchId).Select(b => b.BranchName).FirstOrDefault(),
            u.PreferredLanguage, u.IsActive,
            u.PasswordHash != null, u.ZaloId != null,
            u.LastLoginAt, u.CreatedAt));

    // SuperAdmin chọn cơ sở tùy ý; BranchManager luôn bị ép về cơ sở của mình
    private async Task<(int? BranchId, string? Error)> ResolveBranchAsync(string role, int? requested)
    {
        var branchId = IsSuperAdmin ? requested : User.GetBranchId();

        if ((role is "Teacher" or "BranchManager") && branchId == null)
            return (null, "Vai trò này bắt buộc chọn cơ sở.");

        if (branchId != null && !await db.Branches.AnyAsync(b => b.Id == branchId && b.IsActive))
            return (null, "Cơ sở không tồn tại hoặc đã ngừng hoạt động.");

        return (branchId, null);
    }

    // Không cho khóa giáo viên đang phụ trách lớp chưa kết thúc
    private async Task<string?> DeactivationBlockerAsync(AppUser user)
    {
        if (user.Role != "Teacher") return null;
        var count = await db.Classes.CountAsync(c => c.TeacherId == user.Id && c.Status != "Finished");
        return count > 0
            ? $"Giáo viên đang phụ trách {count} lớp chưa kết thúc. Hãy chuyển lớp cho giáo viên khác trước."
            : null;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<UserDto>>> GetUsers([FromQuery] UserQuery query)
    {
        var q = VisibleUsers();

        if (!string.IsNullOrWhiteSpace(query.Role)) q = q.Where(u => u.Role == query.Role);
        if (query.BranchId.HasValue) q = q.Where(u => u.BranchId == query.BranchId);
        if (query.IsActive.HasValue) q = q.Where(u => u.IsActive == query.IsActive);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim();
            q = q.Where(u => u.FullName.Contains(s) || u.PhoneNumber.Contains(s));
        }

        var total = await q.CountAsync();
        var items = await ProjectToDto(
                q.OrderBy(u => u.FullName).ThenBy(u => u.Id)
                 .Skip((query.Page - 1) * query.PageSize)
                 .Take(query.PageSize))
            .ToListAsync();

        return Ok(new PagedResult<UserDto>(items, total, query.Page, query.PageSize));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserDto>> GetUser(int id)
    {
        // Ngoài phạm vi cũng trả 404 để không lộ việc tài khoản có tồn tại
        var dto = await ProjectToDto(VisibleUsers().Where(u => u.Id == id)).FirstOrDefaultAsync();
        if (dto == null) return NotFound(new { message = "Không tìm thấy người dùng này." });
        return Ok(dto);
    }

    [HttpPost]
    public async Task<ActionResult<UserDto>> CreateUser(CreateUserRequest req)
    {
        if (!CreatableRoles.Contains(req.Role))
            return BadRequest(new { message = "Vai trò không hợp lệ. Chỉ tạo được BranchManager, Teacher hoặc Parent." });

        if (req.Role == "BranchManager" && !IsSuperAdmin)
            return StatusCode(StatusCodes.Status403Forbidden,
                new { message = "Chỉ SuperAdmin mới được tạo quản lý cơ sở." });

        var phone = req.PhoneNumber.Trim();
        if (await db.Users.AnyAsync(u => u.PhoneNumber == phone))
            return Conflict(new { message = "Số điện thoại này đã được đăng ký." });

        var (branchId, error) = await ResolveBranchAsync(req.Role, req.BranchId);
        if (error != null) return BadRequest(new { message = error });

        var user = new AppUser
        {
            PhoneNumber = phone,
            FullName = req.FullName.Trim(),
            Email = string.IsNullOrWhiteSpace(req.Email) ? null : req.Email.Trim(),
            Role = req.Role,
            BranchId = branchId,
            PreferredLanguage = req.PreferredLanguage,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        if (!string.IsNullOrEmpty(req.Password))
            user.PasswordHash = hasher.HashPassword(user, req.Password);

        db.Users.Add(user);
        await db.SaveChangesAsync();

        var dto = await ProjectToDto(db.Users.Where(u => u.Id == user.Id)).FirstAsync();
        return CreatedAtAction(nameof(GetUser), new { id = user.Id }, dto);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, UpdateUserRequest req)
    {
        var user = await VisibleUsers().FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return NotFound(new { message = "Không tìm thấy người dùng này." });

        if (id == User.GetUserId() && !req.IsActive)
            return BadRequest(new { message = "Không thể tự khóa tài khoản của mình." });

        var phone = req.PhoneNumber.Trim();
        if (await db.Users.AnyAsync(u => u.PhoneNumber == phone && u.Id != id))
            return Conflict(new { message = "Số điện thoại này đã được đăng ký." });

        if (IsSuperAdmin)
        {
            if (user.Role == "SuperAdmin")
            {
                user.BranchId = null;
            }
            else
            {
                var (branchId, error) = await ResolveBranchAsync(user.Role, req.BranchId);
                if (error != null) return BadRequest(new { message = error });
                user.BranchId = branchId;
            }
        }
        // BranchManager: bỏ qua req.BranchId, không được chuyển người sang cơ sở khác

        if (!req.IsActive && user.IsActive)
        {
            var blocker = await DeactivationBlockerAsync(user);
            if (blocker != null) return Conflict(new { message = blocker });
        }

        user.PhoneNumber = phone;
        user.FullName = req.FullName.Trim();
        user.Email = string.IsNullOrWhiteSpace(req.Email) ? null : req.Email.Trim();
        user.PreferredLanguage = req.PreferredLanguage;
        user.IsActive = req.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return NoContent();
    }

    // Xóa mềm: chỉ khóa tài khoản, không xóa khỏi database
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await VisibleUsers().FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return NotFound(new { message = "Không tìm thấy người dùng này." });

        if (id == User.GetUserId())
            return BadRequest(new { message = "Không thể tự khóa tài khoản của mình." });

        var blocker = await DeactivationBlockerAsync(user);
        if (blocker != null) return Conflict(new { message = blocker });

        user.IsActive = false;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(int id, ResetPasswordRequest req)
    {
        var user = await VisibleUsers().FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return NotFound(new { message = "Không tìm thấy người dùng này." });

        user.PasswordHash = hasher.HashPassword(user, req.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return NoContent();
    }
}