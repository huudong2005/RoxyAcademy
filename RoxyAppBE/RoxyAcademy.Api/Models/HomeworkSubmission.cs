using System;
using System.Collections.Generic;

namespace RoxyAcademy.Api.Models;

public partial class HomeworkSubmission
{
    public int Id { get; set; }

    public int HomeworkId { get; set; }

    public int ClassId { get; set; }

    public int StudentId { get; set; }

    public string Status { get; set; } = null!;

    public string? SubmissionUrl { get; set; }

    public string? StudentNote { get; set; }

    public DateTime? SubmittedAt { get; set; }

    public string? TeacherFeedback { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public decimal? Score { get; set; }

    public virtual Homework Homework { get; set; } = null!;

    public virtual StudentClass StudentClass { get; set; } = null!;
}
