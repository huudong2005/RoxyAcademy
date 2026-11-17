using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoxyAcademy.Api.Data;
using RoxyAcademy.Api.Dtos;
using RoxyAcademy.Api.Services;
using AppUser = RoxyAcademy.Api.Models.User;   // tránh trùng với ControllerBase.User

namespace RoxyAcademy.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(RoxyDbContext db, ITokenService tokens, IPasswordHasher<AppUser> hasher)
    : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest req)
    {
        var phone = req.PhoneNumber.Trim();
        var user = await db.Users.FirstOrDefaultAsync(u => u.PhoneNumber == phone);

        // Một thông báo chung cho mọi trường hợp sai, không tiết lộ số điện thoại có tồn tại hay không
        var fail = Unauthorized(new { message = "Sai số điện thoại hoặc mật khẩu." });

        if (user is null || !user.IsActive || string.IsNullOrEmpty(user.PasswordHash))
            return fail;

        var result = hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password);
        if (result == PasswordVerificationResult.Failed)
            return fail;
        if (result == PasswordVerificationResult.SuccessRehashNeeded)
            user.PasswordHash = hasher.HashPassword(user, req.Password);

        user.LastLoginAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var (token, expiresAt) = tokens.CreateAccessToken(user);
        return new LoginResponse(token, expiresAt, ToInfo(user));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserInfo>> Me()
    {
        var id = int.Parse(User.FindFirstValue("sub")!);
        var user = await db.Users.FindAsync(id);
        if (user is null || !user.IsActive) return Unauthorized();
        return ToInfo(user);
    }

    [HttpPut("me")]
    [Authorize]
    public async Task<ActionResult<UserInfo>> UpdateMe(UpdateMeRequest req)
    {
        var id = int.Parse(User.FindFirstValue("sub")!);
        var user = await db.Users.FindAsync(id);
        if (user is null || !user.IsActive) return Unauthorized();

        var phone = req.PhoneNumber.Trim();
        if (await db.Users.AnyAsync(u => u.PhoneNumber == phone && u.Id != id))
            return Conflict(new { message = "Số điện thoại này đã được đăng ký." });

        user.PhoneNumber = phone;
        user.Email = string.IsNullOrWhiteSpace(req.Email) ? null : req.Email.Trim();
        user.AvatarUrl = string.IsNullOrWhiteSpace(req.AvatarUrl) ? null : req.AvatarUrl.Trim();
        user.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(ToInfo(user));
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest req)
    {
        var id = int.Parse(User.FindFirstValue("sub")!);
        var user = await db.Users.FindAsync(id);
        if (user is null || !user.IsActive) return Unauthorized();

        if (string.IsNullOrEmpty(user.PasswordHash) ||
            hasher.VerifyHashedPassword(user, user.PasswordHash, req.CurrentPassword) == PasswordVerificationResult.Failed)
        {
            return BadRequest(new { message = "Mật khẩu hiện tại không đúng." });
        }

        user.PasswordHash = hasher.HashPassword(user, req.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new { message = "Đổi mật khẩu thành công." });
    }

    private static UserInfo ToInfo(AppUser u) =>
        new(u.Id, u.FullName, u.Role, u.BranchId, u.PreferredLanguage, u.PhoneNumber, u.Email, u.AvatarUrl);
}