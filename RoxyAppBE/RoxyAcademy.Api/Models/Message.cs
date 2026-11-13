using System;
using System.Collections.Generic;

namespace RoxyAcademy.Api.Models;

public partial class Message
{
    public long Id { get; set; }

    public int SenderId { get; set; }

    public int? ReceiverId { get; set; }

    public int? ClassId { get; set; }

    public int? StudentId { get; set; }

    public string Content { get; set; } = null!;

    public bool IsRead { get; set; }

    public DateTime? ReadAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Class? Class { get; set; }

    public virtual User? Receiver { get; set; }

    public virtual User Sender { get; set; } = null!;

    public virtual Student? Student { get; set; }
}
