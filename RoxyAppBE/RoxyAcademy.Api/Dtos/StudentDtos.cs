using System.ComponentModel.DataAnnotations;

namespace RoxyAcademy.Api.Dtos;

public record StudentDto(
    int Id,
    string FullName,
    DateOnly? DOB,
    string? Gender,
    int ParentId,
    string? ParentName,
    string? ParentPhone,
    int? UserId,
    int BranchId,
    string? BranchName,
    string? School,
    string? Grade,
    string? Note,
    string? AvatarUrl,
    string Status,
    DateTime CreatedAt
);

public class CreateStudentRequest
{
    [Required(ErrorMessage = "Họ tên học viên là bắt buộc"), StringLength(150)]
    public string FullName { get; set; } = "";

    public DateOnly? DOB { get; set; }

    [RegularExpression("^(Male|Female|Other)$", ErrorMessage = "Giới tính chỉ nhận Male, Female hoặc Other")]
    public string? Gender { get; set; }

    public int? ParentId { get; set; }   // Phụ huynh tự tạo thì bỏ qua, hệ thống lấy theo token
    public int? BranchId { get; set; }   // Quản lý cơ sở thì bỏ qua, hệ thống lấy theo token

    [StringLength(200)] public string? School { get; set; }
    [StringLength(50)] public string? Grade { get; set; }
    [StringLength(1000)] public string? Note { get; set; }   // Chỉ nhân viên, phụ huynh gửi cũng bị bỏ qua
    [StringLength(500)] public string? AvatarUrl { get; set; }
}

public class UpdateStudentRequest
{
    [Required(ErrorMessage = "Họ tên học viên là bắt buộc"), StringLength(150)]
    public string FullName { get; set; } = "";

    public DateOnly? DOB { get; set; }

    [RegularExpression("^(Male|Female|Other)$", ErrorMessage = "Giới tính chỉ nhận Male, Female hoặc Other")]
    public string? Gender { get; set; }

    [StringLength(200)] public string? School { get; set; }
    [StringLength(50)] public string? Grade { get; set; }
    [StringLength(500)] public string? AvatarUrl { get; set; }

    // Các trường dưới đây chỉ nhân viên dùng được, phụ huynh gửi cũng bị bỏ qua
    [StringLength(1000)] public string? Note { get; set; }   // Gửi null = xóa ghi chú

    [RegularExpression("^(Active|Paused|Graduated|Dropped)$", ErrorMessage = "Trạng thái không hợp lệ")]
    public string? Status { get; set; }                       // null = giữ nguyên

    public int? BranchId { get; set; }                        // Chỉ SuperAdmin; null = giữ nguyên
}

public class CreateStudentAccountRequest
{
    [Required(ErrorMessage = "Số điện thoại là bắt buộc"),
     RegularExpression(@"^0\d{9}$", ErrorMessage = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0")]
    public string PhoneNumber { get; set; } = "";

    [StringLength(100, MinimumLength = 8, ErrorMessage = "Mật khẩu phải từ 8 ký tự")]
    public string? Password { get; set; }
}

public class StudentQuery
{
    public int? BranchId { get; set; }
    public int? ParentId { get; set; }
    public int? ClassId { get; set; }      // Lấy học viên đang học (Active) của một lớp
    public string? Status { get; set; }
    public string? Search { get; set; }    // Tìm theo tên học viên

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}