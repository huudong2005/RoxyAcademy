using System;
using System.Collections.Generic;

namespace RoxyAcademy.Api.Models;

public partial class LessonProgress
{
    public int Id { get; set; }

    public int ClassId { get; set; }

    public int? ScheduleId { get; set; }

    public DateOnly LessonDate { get; set; }

    public string? Title { get; set; }

    public string Content { get; set; } = null!;

    public int CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Class Class { get; set; } = null!;

    public virtual User CreatedByNavigation { get; set; } = null!;

    public virtual Schedule? Schedule { get; set; }
}
