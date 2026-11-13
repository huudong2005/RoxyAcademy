using System;
using System.Collections.Generic;

namespace RoxyAcademy.Api.Models;

public partial class Branch
{
    public int Id { get; set; }

    public string BranchName { get; set; } = null!;

    public string Address { get; set; } = null!;

    public string? Phone { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<Class> Classes { get; set; } = new List<Class>();

    public virtual ICollection<Newsfeed> Newsfeeds { get; set; } = new List<Newsfeed>();

    public virtual ICollection<Student> Students { get; set; } = new List<Student>();

    public virtual ICollection<Tuition> Tuitions { get; set; } = new List<Tuition>();

    public virtual ICollection<User> Users { get; set; } = new List<User>();
}
