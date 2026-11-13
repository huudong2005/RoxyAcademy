using System.ComponentModel.DataAnnotations;

namespace RoxyAcademy.Api.Dtos;

// Không bao giờ trả PasswordHash/ZaloId ra ngoài, chỉ trả cờ có hay không
public record UserDto(
    int Id,
    string PhoneNumber,
    string FullName,
    string? Email,
    string Role,
    int? BranchId,
    string? BranchName,
    string PreferredLanguage,
    bool IsActive,
    bool HasPassword,
    bool HasZalo,
    DateTime? LastLoginAt,
    DateTime CreatedAt
);

public class CreateUserRequest
{
    [Required(ErrorMessage = "Số điện thoại là bắt buộc"),
     RegularExpression(@"^0\d{9}$", ErrorMessage = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0")]
    public string PhoneNumber { get; set; } = "";

    [Required(ErrorMessage = "Họ tên là bắt buộc"), StringLength(150)]
    public string FullName { get; set; } = "";

    [EmailAddress, StringLength(150)]
    public string? Email { get; set; }

    [Required(ErrorMessage = "Vai trò là bắt buộc")]
    public string Role { get; set; } = "";   // BranchManager | Teacher | Parent

    public int? BranchId { get; set; }

    // Không bắt buộc: để trống thì tài khoản chỉ đăng nhập được sau khi đặt mật khẩu hoặc liên kết Zalo
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Mật khẩu phải từ 8 ký tự")]
    public string? Password { get; set; }

    [RegularExpression("^(vi|en)$", ErrorMessage = "Ngôn ngữ chỉ nhận 'vi' hoặc 'en'")]
    public string PreferredLanguage { get; set; } = "vi";
}

public class UpdateUserRequest
{
    [Required(ErrorMessage = "Số điện thoại là bắt buộc"),
     RegularExpression(@"^0\d{9}$", ErrorMessage = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0")]
    public string PhoneNumber { get; set; } = "";

    [Required(ErrorMessage = "Họ tên là bắt buộc"), StringLength(150)]
    public string FullName { get; set; } = "";

    [EmailAddress, StringLength(150)]
    public string? Email { get; set; }

    public int? BranchId { get; set; }   // Chỉ SuperAdmin được đổi cơ sở

    [RegularExpression("^(vi|en)$", ErrorMessage = "Ngôn ngữ chỉ nhận 'vi' hoặc 'en'")]
    public string PreferredLanguage { get; set; } = "vi";

    public bool IsActive { get; set; }
}

public class ResetPasswordRequest
{
    [Required, StringLength(100, MinimumLength = 8, ErrorMessage = "Mật khẩu phải từ 8 ký tự")]
    public string NewPassword { get; set; } = "";
}

public class UserQuery
{
    public string? Role { get; set; }
    public int? BranchId { get; set; }
    public bool? IsActive { get; set; }
    public string? Search { get; set; }          // Tìm theo họ tên hoặc số điện thoại

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}