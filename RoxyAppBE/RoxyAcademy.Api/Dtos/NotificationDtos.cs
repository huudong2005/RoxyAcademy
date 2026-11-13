using System.ComponentModel.DataAnnotations;

namespace RoxyAcademy.Api.Dtos;

public record NotificationDto(
    long Id,
    int UserId,
    string Title,
    string? Body,
    string Type,
    int? RefId,
    bool IsRead,
    DateTime? ReadAt,
    DateTime CreatedAt
);

public class CreateNotificationRequest
{
    [Required] public int UserId { get; set; }

    [Required, StringLength(200)] public string Title { get; set; } = "";

    [StringLength(500)] public string? Body { get; set; }

    [Required, StringLength(50)] public string Type { get; set; } = "System"; // VD: System, Homework, Payment, LeaveRequest

    public int? RefId { get; set; }
}