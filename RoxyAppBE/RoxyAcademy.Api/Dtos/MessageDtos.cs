using System.ComponentModel.DataAnnotations;

namespace RoxyAcademy.Api.Dtos;

public record MessageDto(
    long Id,
    int SenderId,
    string? SenderName,
    int? ReceiverId,
    string? ReceiverName,
    int? ClassId,
    string? ClassName,
    int? StudentId,
    string? StudentName,
    string Content,
    bool IsRead,
    DateTime? ReadAt,
    DateTime CreatedAt
);

public class SendMessageRequest
{
    public int? ReceiverId { get; set; }

    public int? ClassId { get; set; }

    public int? StudentId { get; set; }

    [Required(ErrorMessage = "Nội dung tin nhắn không được để trống")]
    [StringLength(2000)]
    public string Content { get; set; } = "";
}