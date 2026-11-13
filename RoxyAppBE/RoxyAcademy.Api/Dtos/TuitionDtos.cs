using System.ComponentModel.DataAnnotations;

namespace RoxyAcademy.Api.Dtos;

public record TuitionDto(
    int Id,
    int StudentId,
    string? StudentName,
    int? ClassId,
    string? ClassName, // Lấy tên lớp nếu khoản thu này gắn với 1 lớp cụ thể
    int BranchId,
    string Title,
    decimal Amount,
    decimal Discount,
    DateOnly DueDate,
    bool IsCancelled,
    string? Note,
    DateTime CreatedAt
);

public class CreateTuitionRequest
{
    [Required]
    public int StudentId { get; set; }

    public int? ClassId { get; set; } // Có thể null nếu đây là khoản thu ngoài (ví dụ: tiền đồng phục, giáo trình)

    [Required]
    public int BranchId { get; set; }

    [Required(ErrorMessage = "Tiêu đề khoản thu là bắt buộc"), StringLength(200)]
    public string Title { get; set; } = "";

    [Range(0, double.MaxValue, ErrorMessage = "Số tiền không hợp lệ")]
    public decimal Amount { get; set; }

    [Range(0, double.MaxValue)]
    public decimal Discount { get; set; }

    [Required]
    public DateOnly DueDate { get; set; }

    [StringLength(500)]
    public string? Note { get; set; }
}

public class UpdateTuitionRequest
{
    [Required(ErrorMessage = "Tiêu đề khoản thu là bắt buộc"), StringLength(200)]
    public string Title { get; set; } = "";

    [Range(0, double.MaxValue)]
    public decimal Amount { get; set; }

    [Range(0, double.MaxValue)]
    public decimal Discount { get; set; }

    [Required]
    public DateOnly DueDate { get; set; }

    public bool IsCancelled { get; set; }

    [StringLength(500)]
    public string? Note { get; set; }
}