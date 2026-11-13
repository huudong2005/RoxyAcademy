using System;
using System.Collections.Generic;

namespace RoxyAcademy.Api.Models;

public partial class Payment
{
    public int Id { get; set; }

    public int TuitionId { get; set; }

    public decimal Amount { get; set; }

    public string PaymentMethod { get; set; } = null!;

    public string Status { get; set; } = null!;

    public string? TransactionCode { get; set; }

    public string? ProofImageUrl { get; set; }

    public DateTime? PaidAt { get; set; }

    public int? ConfirmedBy { get; set; }

    public DateTime? ConfirmedAt { get; set; }

    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User? ConfirmedByNavigation { get; set; }

    public virtual Tuition Tuition { get; set; } = null!;
}
