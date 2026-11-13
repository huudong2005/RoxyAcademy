using System.ComponentModel.DataAnnotations;

namespace RoxyAcademy.Api.Dtos;

// Lấy thêm Tên Khóa, Tên Cơ sở, Tên Giáo viên để Web Admin dễ hiển thị
public record ClassDto(
    int Id,
    string ClassName,
    int CourseId,
    string? CourseName,
    int TeacherId,
    string? TeacherName,
    int BranchId,
    string? BranchName,
    string ClassType,
    int? MaxStudents,
    DateOnly? StartDate,
    DateOnly? EndDate,
    decimal? TuitionFee,
    bool IsOpenForRegistration,
    string Status,
    string? Note,
    DateTime CreatedAt
);

public class CreateClassRequest
{
    [Required(ErrorMessage = "Tên lớp học là bắt buộc"), StringLength(100)]
    public string ClassName { get; set; } = "";

    [Required]
    public int CourseId { get; set; }

    [Required]
    public int TeacherId { get; set; }

    [Required]
    public int BranchId { get; set; }

    [Required, StringLength(50)]
    public string ClassType { get; set; } = "Offline"; // Ví dụ: Offline, Online

    [Range(1, 100, ErrorMessage = "Số học viên tối đa không hợp lệ")]
    public int? MaxStudents { get; set; }

    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Học phí không hợp lệ")]
    public decimal? TuitionFee { get; set; }

    [StringLength(500)]
    public string? Note { get; set; }
}

public class UpdateClassRequest : CreateClassRequest
{
    public bool IsOpenForRegistration { get; set; }

    [Required, StringLength(50)]
    public string Status { get; set; } = "";
}