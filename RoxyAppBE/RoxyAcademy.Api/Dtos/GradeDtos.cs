using System.ComponentModel.DataAnnotations;

namespace RoxyAcademy.Api.Dtos;

public record GradeDto(
    int Id,
    int StudentId,
    string? StudentName,
    int ClassId,
    string? ClassName,
    string ExamName,
    string ExamType,
    DateOnly? ExamDate,
    decimal? Score,
    decimal MaxScore,
    string? TeacherComment,
    int? GradedBy,
    string? GradedByName,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public class CreateGradeRequest
{
    [Required] public int StudentId { get; set; }
    [Required] public int ClassId { get; set; }

    [Required(ErrorMessage = "Tên bài kiểm tra là bắt buộc"), StringLength(150)]
    public string ExamName { get; set; } = "";

    [Required(ErrorMessage = "Loại bài kiểm tra là bắt buộc"), StringLength(50)]
    public string ExamType { get; set; } = "15Min"; // Ví dụ: 15Min, 45Min, MidTerm, Final

    public DateOnly? ExamDate { get; set; }

    [Range(0, 1000, ErrorMessage = "Điểm số không hợp lệ")]
    public decimal? Score { get; set; }

    [Range(1, 1000)]
    public decimal MaxScore { get; set; } = 10; // Mặc định thang điểm 10

    [StringLength(500)]
    public string? TeacherComment { get; set; }
}

public class UpdateGradeRequest
{
    [Required(ErrorMessage = "Tên bài kiểm tra là bắt buộc"), StringLength(150)]
    public string ExamName { get; set; } = "";

    [Required(ErrorMessage = "Loại bài kiểm tra là bắt buộc"), StringLength(50)]
    public string ExamType { get; set; } = "";

    public DateOnly? ExamDate { get; set; }

    [Range(0, 1000)]
    public decimal? Score { get; set; }

    [Range(1, 1000)]
    public decimal MaxScore { get; set; }

    [StringLength(500)]
    public string? TeacherComment { get; set; }
}