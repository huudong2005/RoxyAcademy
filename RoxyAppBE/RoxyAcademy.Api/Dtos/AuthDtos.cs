using System.ComponentModel.DataAnnotations;

namespace RoxyAcademy.Api.Dtos;

public class LoginRequest
{
    [Required, StringLength(15)]
    public string PhoneNumber { get; set; } = "";

    [Required, StringLength(100)]
    public string Password { get; set; } = "";
}

public class ZaloLoginRequest
{
    [Required(ErrorMessage = "AccessToken là bắt buộc.")]
    public string AccessToken { get; set; } = "";

    [Required(ErrorMessage = "PhoneCode là bắt buộc.")]
    public string PhoneCode { get; set; } = "";
}

public record UserInfo(
    int Id,
    string FullName,
    string Role,
    int? BranchId,
    string PreferredLanguage,
    string PhoneNumber,
    string? Email,
    string? AvatarUrl
);

public record LoginResponse(string AccessToken, DateTime ExpiresAt, UserInfo User);

public class UpdateMeRequest
{
    [Required(ErrorMessage = "Số điện thoại là bắt buộc"),
     RegularExpression(@"^0\d{9}$", ErrorMessage = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0")]
    public string PhoneNumber { get; set; } = "";

    [EmailAddress(ErrorMessage = "Email không hợp lệ"), StringLength(150)]
    public string? Email { get; set; }

    [StringLength(500)]
    public string? AvatarUrl { get; set; }
}

public class ChangePasswordRequest
{
    [Required(ErrorMessage = "Vui lòng nhập mật khẩu hiện tại.")]
    [StringLength(100)]
    public string CurrentPassword { get; set; } = "";

    [Required(ErrorMessage = "Vui lòng nhập mật khẩu mới.")]
    [MinLength(8, ErrorMessage = "Mật khẩu mới phải có ít nhất 8 ký tự.")]
    [StringLength(100)]
    public string NewPassword { get; set; } = "";
}