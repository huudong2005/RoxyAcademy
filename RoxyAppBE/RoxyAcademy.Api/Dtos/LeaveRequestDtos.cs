using System.ComponentModel.DataAnnotations;

namespace RoxyAcademy.Api.Dtos;

public record LeaveRequestDto(
    int Id,
    string RequesterType,
    int? StudentId,
    string? StudentName,
    int? TeacherId,
    string? TeacherName,
    int? ClassId,
    string? ClassName,
    int? ScheduleId,
    DateOnly LeaveDate,
    string Reason,
    string Status,
    int RequestedBy,
    string? RequestedByName,
    int? ReviewedBy,
    string? ReviewedByName,
    DateTime? ReviewedAt,
    string? ReviewNote,
    DateTime CreatedAt
);

public class CreateLeaveRequest
{
    public int? StudentId { get; set; }

    public int? TeacherId { get; set; }

    public int? ClassId { get; set; }

    public int? ScheduleId { get; set; }

    [Required]
    public DateOnly LeaveDate { get; set; }

    [Required(ErrorMessage = "Lý do xin nghỉ là bắt buộc"), StringLength(500)]
    public string Reason { get; set; } = "";

    [Required]
    [RegularExpression("^(Student|Teacher)$", ErrorMessage = "Loại người xin nghỉ chỉ nhận: Student hoặc Teacher")]
    public string RequesterType { get; set; } = "";
}

public class ReviewLeaveRequest
{
    [Required(ErrorMessage = "Trạng thái duyệt là bắt buộc")]
    [RegularExpression("^(Approved|Rejected)$", ErrorMessage = "Trạng thái chỉ nhận Approved (Đồng ý) hoặc Rejected (Từ chối)")]
    public string Status { get; set; } = "";

    [StringLength(500)]
    public string? ReviewNote { get; set; }
}
