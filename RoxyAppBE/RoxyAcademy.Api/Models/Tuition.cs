using System;
using System.Collections.Generic;

namespace RoxyAcademy.Api.Models;

public partial class Tuition
{
    public int Id { get; set; }

    public int StudentId { get; set; }

    public int? ClassId { get; set; }

    public int BranchId { get; set; }

    public string Title { get; set; } = null!;

    public decimal Amount { get; set; }

    public decimal Discount { get; set; }

    public DateOnly DueDate { get; set; }

    public bool IsCancelled { get; set; }

    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Branch Branch { get; set; } = null!;

    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();

    public virtual Student Student { get; set; } = null!;

    public virtual StudentClass? StudentClass { get; set; }
}
