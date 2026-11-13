using System;
using System.Collections.Generic;

namespace RoxyAcademy.Api.Models;

public partial class Student
{
    public int Id { get; set; }

    public string FullName { get; set; } = null!;

    public DateOnly? Dob { get; set; }

    public string? Gender { get; set; }

    public int ParentId { get; set; }

    public int? UserId { get; set; }

    public int BranchId { get; set; }

    public string? School { get; set; }

    public string? Grade { get; set; }

    public string? Note { get; set; }

    public string? AvatarUrl { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public string? ParentRole { get; set; }

    public string? UserRole { get; set; }

    public virtual Branch Branch { get; set; } = null!;

    public virtual ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();

    public virtual ICollection<Message> Messages { get; set; } = new List<Message>();

    public virtual ICollection<StudentClass> StudentClasses { get; set; } = new List<StudentClass>();

    public virtual ICollection<Tuition> Tuitions { get; set; } = new List<Tuition>();

    public virtual User? User { get; set; }

    public virtual User? UserNavigation { get; set; }
}
