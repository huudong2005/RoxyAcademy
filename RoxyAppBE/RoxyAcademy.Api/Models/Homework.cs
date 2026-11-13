using System;
using System.Collections.Generic;

namespace RoxyAcademy.Api.Models;

public partial class Homework
{
    public int Id { get; set; }

    public int ClassId { get; set; }

    public int? ScheduleId { get; set; }

    public string Title { get; set; } = null!;

    public string? Description { get; set; }

    public string? AttachmentUrl { get; set; }

    public DateTime? DueDate { get; set; }

    public int CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Class Class { get; set; } = null!;

    public virtual User CreatedByNavigation { get; set; } = null!;

    public virtual ICollection<HomeworkSubmission> HomeworkSubmissions { get; set; } = new List<HomeworkSubmission>();

    public virtual Schedule? Schedule { get; set; }
}
