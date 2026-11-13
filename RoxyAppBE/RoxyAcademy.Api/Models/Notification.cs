using System;
using System.Collections.Generic;

namespace RoxyAcademy.Api.Models;

public partial class Notification
{
    public long Id { get; set; }

    public int UserId { get; set; }

    public string Title { get; set; } = null!;

    public string? Body { get; set; }

    public string Type { get; set; } = null!;

    public int? RefId { get; set; }

    public bool IsRead { get; set; }

    public DateTime? ReadAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
