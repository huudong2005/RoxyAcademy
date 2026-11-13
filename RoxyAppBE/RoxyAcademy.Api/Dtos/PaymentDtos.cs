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
    DateTime CreatedAt
);

public class CreatePaymentRequest
{
    [Required]
    public int TuitionId { get; set; }

    [Range(1, double.MaxValue, ErrorMessage = "Số tiền thanh toán phải lớn hơn 0")]
    public decimal Amount { get; set; }

    [Required(ErrorMessage = "Phương thức thanh toán là bắt buộc")]
    [RegularExpression("^(BankTransfer|Cash|ZaloPay|Other)$", ErrorMessage = "Phương thức chỉ nhận: BankTransfer, Cash, ZaloPay, Other")]
    public string PaymentMethod { get; set; } = "Cash";

    [StringLength(100)]
    public string? TransactionCode { get; set; }

    [StringLength(500)]
    public string? ProofImageUrl { get; set; }

    public DateTime? PaidAt { get; set; }

    [StringLength(500)]
    public string? Note { get; set; }
}

public class ConfirmPaymentRequest
{
    [Required(ErrorMessage = "Trạng thái là bắt buộc")]
    [RegularExpression("^(Confirmed|Rejected)$", ErrorMessage = "Trạng thái chỉ nhận Confirmed hoặc Rejected")]
    public string Status { get; set; } = "";

    [StringLength(500)]
    public string? Note { get; set; }
}