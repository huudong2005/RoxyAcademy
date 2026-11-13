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

    private static UserInfo ToInfo(AppUser u) =>
        new(u.Id, u.FullName, u.Role, u.BranchId, u.PreferredLanguage);
}