using System.ComponentModel.DataAnnotations;

namespace RoxyAcademy.Api.Dtos;

// Dùng để trả dữ liệu về (Read)
public record CourseDto(
    int Id,
    string? CourseCode,
    string CourseName,
    string? Description,
    int? TotalSessions,
    decimal? DefaultFee,
    bool IsActive,
    DateTime CreatedAt
);

// Dùng để nhận dữ liệu khi Thêm mới (Create)
public class CreateCourseRequest
{
    [StringLength(30, ErrorMessage = "Mã khóa học không được vượt quá 30 ký tự")]
    public string? CourseCode { get; set; }

    [Required(ErrorMessage = "Tên khóa học là bắt buộc"), StringLength(150)]
    public string CourseName { get; set; } = "";

    [StringLength(500)]
    public string? Description { get; set; }

    [Range(1, 1000, ErrorMessage = "Số buổi học phải lớn hơn 0")]
    public int? TotalSessions { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Học phí không hợp lệ")]
    public decimal? DefaultFee { get; set; }
}

// Dùng để nhận dữ liệu khi Cập nhật (Update)
public class UpdateCourseRequest
{
    [StringLength(30, ErrorMessage = "Mã khóa học không được vượt quá 30 ký tự")]
    public string? CourseCode { get; set; }

    [Required(ErrorMessage = "Tên khóa học là bắt buộc"), StringLength(150)]
    public string CourseName { get; set; } = "";

    [StringLength(500)]
    public string? Description { get; set; }

    [Range(1, 1000, ErrorMessage = "Số buổi học phải lớn hơn 0")]
    public int? TotalSessions { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Học phí không hợp lệ")]
    public decimal? DefaultFee { get; set; }

    public bool IsActive { get; set; }
}