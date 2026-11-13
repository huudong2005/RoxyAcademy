using System;
using System.Collections.Generic;

namespace RoxyAcademy.Api.Models;

public partial class LeaveRequest
{
    public int Id { get; set; }

    public int? StudentId { get; set; }

    public int? TeacherId { get; set; }

    public int RequestedBy { get; set; }

    public int? ClassId { get; set; }

    public int? ScheduleId { get; set; }

    public DateOnly LeaveDate { get; set; }

    public string Reason { get; set; } = null!;

    public string Status { get; set; } = null!;

    public int? ReviewedBy { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public string? ReviewNote { get; set; }

    public DateTime CreatedAt { get; set; }

    public string RequesterType { get; set; } = null!;

    public string? TeacherRole { get; set; }

    public virtual Class? Class { get; set; }

    public virtual User RequestedByNavigation { get; set; } = null!;

    public virtual User? ReviewedByNavigation { get; set; }

    public virtual Schedule? Schedule { get; set; }

    public virtual Student? Student { get; set; }

    public virtual StudentClass? StudentClass { get; set; }

    public virtual User? User { get; set; }
}
