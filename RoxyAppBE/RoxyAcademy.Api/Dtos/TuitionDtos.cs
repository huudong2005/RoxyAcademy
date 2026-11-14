using System.ComponentModel.DataAnnotations;

namespace RoxyAcademy.Api.Dtos;

public record TuitionDto(
    int Id,
    int StudentId,
    string? StudentName,
    int? ClassId,
    string? ClassName,
    int BranchId,
    string? BranchName,
    string Title,
    decimal Amount,
    decimal TotalAmount,
    decimal Discount,
    decimal FinalAmount,
    decimal PaidAmount,
    decimal RemainingAmount,
    string Status,
    bool IsOverdue,
    DateOnly DueDate,
    bool IsCancelled,
    string? Note,
    DateTime CreatedAt
);

public class CreateTuitionRequest
{
    [Required(ErrorMessage = "Mã học viên là bắt buộc")]
    public int StudentId { get; set; }

    public int? ClassId { get; set; } // Có thể null nếu đây là khoản thu ngoài (ví dụ: tiền đồng phục, giáo trình)

    [Required(ErrorMessage = "Mã cơ sở là bắt buộc")]
    public int BranchId { get; set; }

    [Required(ErrorMessage = "Tiêu đề khoản thu là bắt buộc"), StringLength(200, ErrorMessage = "Tiêu đề tối đa 200 ký tự")]
    public string Title { get; set; } = "";

    [Range(0, double.MaxValue, ErrorMessage = "Số tiền học phí phải lớn hơn hoặc bằng 0")]
    public decimal Amount { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Số tiền giảm giá phải lớn hơn hoặc bằng 0")]
    public decimal Discount { get; set; } = 0;

    [Required(ErrorMessage = "Hạn thanh toán là bắt buộc")]
    public DateOnly DueDate { get; set; }

    [StringLength(500, ErrorMessage = "Ghi chú tối đa 500 ký tự")]
    public string? Note { get; set; }
}

public class UpdateTuitionRequest
{
    [Required(ErrorMessage = "Tiêu đề khoản thu là bắt buộc"), StringLength(200, ErrorMessage = "Tiêu đề tối đa 200 ký tự")]
    public string Title { get; set; } = "";

    [Range(0, double.MaxValue, ErrorMessage = "Số tiền học phí phải lớn hơn hoặc bằng 0")]
    public decimal Amount { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Số tiền giảm giá phải lớn hơn hoặc bằng 0")]
    public decimal Discount { get; set; } = 0;

    [Required(ErrorMessage = "Hạn thanh toán là bắt buộc")]
    public DateOnly DueDate { get; set; }

    public bool IsCancelled { get; set; }

    [StringLength(500, ErrorMessage = "Ghi chú tối đa 500 ký tự")]
    public string? Note { get; set; }
}