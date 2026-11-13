using System;
using System.Collections.Generic;

namespace RoxyAcademy.Api.Models;

public partial class Course
{
    public int Id { get; set; }

    public string? CourseCode { get; set; }

    public string CourseName { get; set; } = null!;

    public string? CourseNameEn { get; set; }

    public string? Description { get; set; }

    public string? DescriptionEn { get; set; }

    public int? TotalSessions { get; set; }

    public decimal? DefaultFee { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<Class> Classes { get; set; } = new List<Class>();
}
