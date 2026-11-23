using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
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
public class AuthController(
    RoxyDbContext db,
    ITokenService tokens,
    IPasswordHasher<AppUser> hasher,
    IConfiguration configuration,
    IHttpClientFactory httpClientFactory,
    ILogger<AuthController> logger)
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

    [HttpPost("zalo-login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> ZaloLogin([FromBody] ZaloLoginRequest? req)
    {
        if (req is null || string.IsNullOrWhiteSpace(req.AccessToken) || string.IsNullOrWhiteSpace(req.PhoneCode))
        {
            return BadRequest(new { message = "Vui lòng cung cấp đầy đủ accessToken và phoneCode từ Zalo." });
        }

        var appId = configuration["Zalo:AppId"]?.Trim();
        var appSecret = configuration["Zalo:AppSecret"]?.Trim();
        if (string.IsNullOrWhiteSpace(appSecret))
        {
            logger.LogError("Chưa cấu hình Zalo:AppSecret trên máy chủ (AppId: {AppId}).", string.IsNullOrWhiteSpace(appId) ? "<empty>" : appId);
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Máy chủ chưa cấu hình Zalo" });
        }

        var accessToken = req.AccessToken.Trim();
        var phoneCode = req.PhoneCode.Trim();
        string? rawPhone = null;
        string? zaloUserId = null;

        try
        {
            var client = httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(15);

            // 1. Đổi phoneCode lấy số điện thoại qua Zalo Open API: GET https://graph.zalo.me/v2.0/me/info
            using var infoRequest = new HttpRequestMessage(HttpMethod.Get, "https://graph.zalo.me/v2.0/me/info");
            infoRequest.Headers.TryAddWithoutValidation("access_token", accessToken);
            infoRequest.Headers.TryAddWithoutValidation("code", phoneCode);
            infoRequest.Headers.TryAddWithoutValidation("secret_key", appSecret);

            using var infoResponse = await client.SendAsync(infoRequest);
            if (!infoResponse.IsSuccessStatusCode)
            {
                logger.LogWarning("Zalo /v2.0/me/info trả về HTTP {StatusCode}.", (int)infoResponse.StatusCode);
                return BadRequest(new { message = "Mã xác thực Zalo không hợp lệ hoặc đã hết hạn, vui lòng thử lại." });
            }

            var infoJson = await infoResponse.Content.ReadAsStringAsync();
            using (var doc = JsonDocument.Parse(infoJson))
            {
                var root = doc.RootElement;
                if (HasZaloApiError(root, out var errCode))
                {
                    logger.LogWarning("Zalo /v2.0/me/info trả về mã lỗi Zalo: {ErrorCode}.", errCode);
                    return BadRequest(new { message = "Mã xác thực Zalo không hợp lệ hoặc đã hết hạn, vui lòng thử lại." });
                }

                if (root.TryGetProperty("data", out var dataElem) && dataElem.ValueKind == JsonValueKind.Object)
                {
                    if (dataElem.TryGetProperty("number", out var numElem) && numElem.ValueKind == JsonValueKind.String)
                        rawPhone = numElem.GetString();

                    if (dataElem.TryGetProperty("id", out var dataIdElem) && dataIdElem.ValueKind is JsonValueKind.String or JsonValueKind.Number)
                        zaloUserId = dataIdElem.ValueKind == JsonValueKind.String ? dataIdElem.GetString() : dataIdElem.GetRawText();
                }

                if (string.IsNullOrWhiteSpace(rawPhone) && root.TryGetProperty("number", out var rootNumElem) && rootNumElem.ValueKind == JsonValueKind.String)
                {
                    rawPhone = rootNumElem.GetString();
                }

                if (string.IsNullOrWhiteSpace(zaloUserId) && root.TryGetProperty("id", out var rootIdElem) && rootIdElem.ValueKind is JsonValueKind.String or JsonValueKind.Number)
                {
                    zaloUserId = rootIdElem.ValueKind == JsonValueKind.String ? rootIdElem.GetString() : rootIdElem.GetRawText();
                }
            }

            if (string.IsNullOrWhiteSpace(rawPhone))
            {
                logger.LogWarning("Zalo /v2.0/me/info không trả về số điện thoại.");
                return BadRequest(new { message = "Mã xác thực Zalo không hợp lệ hoặc đã hết hạn, vui lòng thử lại." });
            }

            // 2. Nếu /v2.0/me/info chưa trả về Zalo User ID, gọi tiếp GET https://graph.zalo.me/v2.0/me?fields=id,name
            if (string.IsNullOrWhiteSpace(zaloUserId))
            {
                using var meRequest = new HttpRequestMessage(HttpMethod.Get, "https://graph.zalo.me/v2.0/me?fields=id,name");
                meRequest.Headers.TryAddWithoutValidation("access_token", accessToken);
                meRequest.Headers.TryAddWithoutValidation("appsecret_proof", ComputeHmacSha256Hex(accessToken, appSecret));

                using var meResponse = await client.SendAsync(meRequest);
                if (!meResponse.IsSuccessStatusCode)
                {
                    logger.LogWarning("Zalo /v2.0/me trả về HTTP {StatusCode}.", (int)meResponse.StatusCode);
                    return BadRequest(new { message = "Mã xác thực Zalo không hợp lệ hoặc đã hết hạn, vui lòng thử lại." });
                }

                var meJson = await meResponse.Content.ReadAsStringAsync();
                using var meDoc = JsonDocument.Parse(meJson);
                var meRoot = meDoc.RootElement;
                if (HasZaloApiError(meRoot, out var meErrCode))
                {
                    logger.LogWarning("Zalo /v2.0/me trả về mã lỗi Zalo: {ErrorCode}.", meErrCode);
                    return BadRequest(new { message = "Mã xác thực Zalo không hợp lệ hoặc đã hết hạn, vui lòng thử lại." });
                }

                if (meRoot.TryGetProperty("id", out var meIdElem) && meIdElem.ValueKind is JsonValueKind.String or JsonValueKind.Number)
                {
                    zaloUserId = meIdElem.ValueKind == JsonValueKind.String ? meIdElem.GetString() : meIdElem.GetRawText();
                }
                else if (meRoot.TryGetProperty("data", out var meDataElem) && meDataElem.ValueKind == JsonValueKind.Object &&
                         meDataElem.TryGetProperty("id", out var meDataIdElem) && meDataIdElem.ValueKind is JsonValueKind.String or JsonValueKind.Number)
                {
                    zaloUserId = meDataIdElem.ValueKind == JsonValueKind.String ? meDataIdElem.GetString() : meDataIdElem.GetRawText();
                }
            }
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            logger.LogWarning("Lỗi khi gọi Zalo Open API ({ExceptionType}): {ErrorMessage}", ex.GetType().Name, ex.Message);
            return BadRequest(new { message = "Mã xác thực Zalo không hợp lệ hoặc đã hết hạn, vui lòng thử lại." });
        }

        zaloUserId = zaloUserId?.Trim();
        if (string.IsNullOrWhiteSpace(zaloUserId))
        {
            logger.LogWarning("Không lấy được Zalo User ID từ Zalo Open API.");
            return BadRequest(new { message = "Mã xác thực Zalo không hợp lệ hoặc đã hết hạn, vui lòng thử lại." });
        }

        // 3. Chuẩn hóa số điện thoại về dạng 10 số bắt đầu bằng 0 (84xxxxxxxxx / +84xxxxxxxxx -> 0xxxxxxxxx)
        var phone = NormalizeVietnamPhone(rawPhone);
        if (!Regex.IsMatch(phone, @"^0\d{9}$"))
        {
            return BadRequest(new { message = "Số điện thoại từ Zalo không hợp lệ." });
        }

        // 4. Tìm Users theo PhoneNumber đã chuẩn hóa
        var user = await db.Users.FirstOrDefaultAsync(u => u.PhoneNumber == phone);
        if (user is null)
        {
            return NotFound(new { message = "Số điện thoại chưa được đăng ký tại trung tâm, vui lòng liên hệ trung tâm." });
        }

        // 5. Kiểm tra trạng thái hoạt động
        if (!user.IsActive)
        {
            return Unauthorized(new { message = "Sai số điện thoại hoặc mật khẩu." });
        }

        // 6. Chỉ cho phép role Parent và Student đăng nhập qua Zalo Mini App
        if (user.Role != "Parent" && user.Role != "Student")
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Chỉ tài khoản Phụ huynh và Học viên mới được đăng nhập qua Zalo Mini App." });
        }

        // 7. Kiểm tra và liên kết ZaloId
        if (!string.IsNullOrWhiteSpace(user.ZaloId) && user.ZaloId != zaloUserId)
        {
            return BadRequest(new { message = "Tài khoản Zalo này đã liên kết với một số điện thoại khác." });
        }

        if (await db.Users.AnyAsync(u => u.ZaloId == zaloUserId && u.Id != user.Id))
        {
            return BadRequest(new { message = "Tài khoản Zalo này đã liên kết với một số điện thoại khác." });
        }

        if (string.IsNullOrWhiteSpace(user.ZaloId))
        {
            user.ZaloId = zaloUserId;
            user.UpdatedAt = DateTime.UtcNow;
        }

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

    private static bool HasZaloApiError(JsonElement root, out string errorCode)
    {
        errorCode = "0";
        if (!root.TryGetProperty("error", out var errProp))
            return false;

        if (errProp.ValueKind == JsonValueKind.Number && errProp.TryGetInt32(out var code))
        {
            errorCode = code.ToString();
            return code != 0;
        }

        if (errProp.ValueKind == JsonValueKind.String)
        {
            errorCode = errProp.GetString() ?? "";
            return errorCode != "0" && !string.IsNullOrEmpty(errorCode);
        }

        return false;
    }

    private static string ComputeHmacSha256Hex(string data, string key)
    {
        var keyBytes = Encoding.UTF8.GetBytes(key);
        var dataBytes = Encoding.UTF8.GetBytes(data);
        var hashBytes = HMACSHA256.HashData(keyBytes, dataBytes);
        return Convert.ToHexStringLower(hashBytes);
    }

    private static string NormalizeVietnamPhone(string rawPhone)
    {
        var cleaned = rawPhone.Trim().Replace(" ", "").Replace("-", "").Replace(".", "");
        if (cleaned.StartsWith('+'))
            cleaned = cleaned[1..];
        if (cleaned.Length == 11 && cleaned.StartsWith("84") && Regex.IsMatch(cleaned, @"^84\d{9}$"))
            cleaned = "0" + cleaned[2..];
        return cleaned;
    }
}