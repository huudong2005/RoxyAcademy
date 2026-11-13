using System.ComponentModel.DataAnnotations;

namespace RoxyAcademy.Api.Dtos;

// --- DTO BÀI TẬP (HOMEWORK) ---
public record HomeworkDto(
    int Id,
    int ClassId,
    string? ClassName,
    int? ScheduleId,
    string Title,
    string? Description,
    string? AttachmentUrl,
    DateTime? DueDate,
    int CreatedBy,
    string? CreatedByName,
    DateTime CreatedAt
);

public class CreateHomeworkRequest
{
    [Required] public int ClassId { get; set; }
    public int? ScheduleId { get; set; } // Nếu bài tập giao riêng cho 1 buổi học
    [Required, StringLength(200)] public string Title { get; set; } = "";
    [StringLength(1000)] public string? Description { get; set; }
    [StringLength(500)] public string? AttachmentUrl { get; set; }
    public DateTime? DueDate { get; set; }
}

public class UpdateHomeworkRequest
{
    [Required, StringLength(200)] public string Title { get; set; } = "";
    [StringLength(1000)] public string? Description { get; set; }
    [StringLength(500)] public string? AttachmentUrl { get; set; }
    public DateTime? DueDate { get; set; }
}

// --- DTO BÀI NỘP (HOMEWORK SUBMISSION) ---
public record HomeworkSubmissionDto(
    int Id,
    int HomeworkId,
    int ClassId,
    int StudentId,
    string? StudentName,
    string Status,
    string? SubmissionUrl,
    string? StudentNote,
    DateTime? SubmittedAt,
    string? TeacherFeedback,
    DateTime? ReviewedAt
);

public class SubmitHomeworkRequest
{
    [StringLength(500)] public string? SubmissionUrl { get; set; } // Link Google Drive/Ảnh chụp bài làm
    [StringLength(500)] public string? StudentNote { get; set; }
}

public class ReviewHomeworkRequest
{
    [Required]
    [RegularExpression("^(Evaluated|Rejected)$", ErrorMessage = "Trạng thái chấm bài chỉ nhận: Evaluated (Đã chấm), Rejected (Yêu cầu làm lại)")]
    public string Status { get; set; } = "Evaluated";

    [StringLength(1000)] public string? TeacherFeedback { get; set; }
}