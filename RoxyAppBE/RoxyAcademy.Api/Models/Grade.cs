using System;
using System.Collections.Generic;

namespace RoxyAcademy.Api.Models;

public partial class Grade
{
    public int Id { get; set; }

    public int StudentId { get; set; }

    public int ClassId { get; set; }

    public string ExamName { get; set; } = null!;

    public string ExamType { get; set; } = null!;

    public DateOnly? ExamDate { get; set; }

    public decimal? Score { get; set; }

    public decimal MaxScore { get; set; }

    public string? TeacherComment { get; set; }

    public int? GradedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual User? GradedByNavigation { get; set; }

    public virtual StudentClass StudentClass { get; set; } = null!;
}
