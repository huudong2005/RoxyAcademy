using System;
using System.Collections.Generic;

namespace RoxyAcademy.Api.Models;

public partial class Newsfeed
{
    public int Id { get; set; }

    public string Title { get; set; } = null!;

    public string Content { get; set; } = null!;

    public string? TitleEn { get; set; }

    public string? ContentEn { get; set; }

    public string? ImageUrl { get; set; }

    public string TargetAudience { get; set; } = null!;

    public int? BranchId { get; set; }

    public bool IsPinned { get; set; }

    public bool IsPublished { get; set; }

    public int CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Branch? Branch { get; set; }

    public virtual User CreatedByNavigation { get; set; } = null!;
}
