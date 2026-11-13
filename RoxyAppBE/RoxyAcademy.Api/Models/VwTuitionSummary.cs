using System;
using System.Collections.Generic;

namespace RoxyAcademy.Api.Models;

public partial class VwTuitionSummary
{
    public int TuitionId { get; set; }

    public int StudentId { get; set; }

    public int? ClassId { get; set; }

    public int BranchId { get; set; }

    public string Title { get; set; } = null!;

    public DateOnly DueDate { get; set; }

    public decimal? NetAmount { get; set; }

    public decimal PaidAmount { get; set; }

    public decimal PendingAmount { get; set; }

    public decimal? RemainingAmount { get; set; }

    public string PaymentStatus { get; set; } = null!;

    public int IsOverdue { get; set; }
}
