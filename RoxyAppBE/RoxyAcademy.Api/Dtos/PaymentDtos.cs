using System.ComponentModel.DataAnnotations;

namespace RoxyAcademy.Api.Dtos;

public record PaymentDto(
    int Id,
    int TuitionId,
    decimal Amount,
    string PaymentMethod,
    string Status,
    string? TransactionCode,
    string? ProofImageUrl,
    DateTime? PaidAt,
    int? ConfirmedBy,
    string? ConfirmedByName,
    DateTime? ConfirmedAt,
    string? Note,
    DateTime CreatedAt,
    string? TuitionTitle = null,
    string? StudentName = null
);

public class CreatePaymentRequest
{
    [Required(ErrorMessage = "Mã khoản thu (TuitionId) là bắt buộc")]
    public int TuitionId { get; set; }

    [Range(1, double.MaxValue, ErrorMessage = "Số tiền thanh toán phải lớn hơn 0")]
    public decimal Amount { get; set; }

    [Required(ErrorMessage = "Phương thức thanh toán là bắt buộc")]
    [RegularExpression("^(BankTransfer|Cash|ZaloPay|Other)$", ErrorMessage = "Phương thức chỉ nhận: BankTransfer, Cash, ZaloPay, Other")]
    public string PaymentMethod { get; set; } = "Cash";

    [StringLength(100, ErrorMessage = "Mã giao dịch tối đa 100 ký tự")]
    public string? TransactionCode { get; set; }

    [StringLength(500, ErrorMessage = "Đường dẫn ảnh chứng từ tối đa 500 ký tự")]
    public string? ProofImageUrl { get; set; }

    public DateTime? PaidAt { get; set; }

    [StringLength(500, ErrorMessage = "Ghi chú tối đa 500 ký tự")]
    public string? Note { get; set; }
}

public class ConfirmPaymentRequest
{
    [Required(ErrorMessage = "Trạng thái xác nhận là bắt buộc")]
    [RegularExpression("^(Confirmed|Rejected)$", ErrorMessage = "Trạng thái chỉ nhận Confirmed hoặc Rejected")]
    public string Status { get; set; } = "";

    [StringLength(500, ErrorMessage = "Ghi chú duyệt tối đa 500 ký tự")]
    public string? Note { get; set; }
}