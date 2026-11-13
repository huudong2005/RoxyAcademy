using System;
using System.Collections.Generic;

namespace RoxyAcademy.Api.Models;

public partial class Attendance
{
    public long Id { get; set; }

    public int ScheduleId { get; set; }

    public int ClassId { get; set; }

    public int StudentId { get; set; }

    public string Status { get; set; } = null!;

    public string? Note { get; set; }

    public int? MarkedBy { get; set; }

    public DateTime MarkedAt { get; set; }

    public virtual User? MarkedByNavigation { get; set; }

    public virtual Schedule Schedule { get; set; } = null!;

    public virtual StudentClass StudentClass { get; set; } = null!;
}
