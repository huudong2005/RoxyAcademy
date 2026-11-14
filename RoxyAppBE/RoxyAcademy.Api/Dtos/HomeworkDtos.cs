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
    DateTime CreatedAt,
    int? BranchId = null,
    string? BranchName = null,
    int TotalSubmissions = 0,
    int SubmittedCount = 0,
    int ReviewedCount = 0
);

public class CreateHomeworkRequest
{
    [Required(ErrorMessage = "ClassId là bắt buộc")]
    public int ClassId { get; set; }

    public int? ScheduleId { get; set; } // Nếu bài tập giao riêng cho 1 buổi học

    [Required(ErrorMessage = "Tiêu đề bài tập là bắt buộc"), StringLength(200, ErrorMessage = "Tiêu đề tối đa 200 ký tự")]
    public string Title { get; set; } = "";

    [StringLength(1000, ErrorMessage = "Mô tả tối đa 1000 ký tự")]
    public string? Description { get; set; }

    [StringLength(500, ErrorMessage = "Đường dẫn đính kèm tối đa 500 ký tự")]
    public string? AttachmentUrl { get; set; }

    public DateTime? DueDate { get; set; }
}

public class UpdateHomeworkRequest
{
    public int? ScheduleId { get; set; }

    [Required(ErrorMessage = "Tiêu đề bài tập là bắt buộc"), StringLength(200, ErrorMessage = "Tiêu đề tối đa 200 ký tự")]
    public string Title { get; set; } = "";

    [StringLength(1000, ErrorMessage = "Mô tả tối đa 1000 ký tự")]
    public string? Description { get; set; }

    [StringLength(500, ErrorMessage = "Đường dẫn đính kèm tối đa 500 ký tự")]
    public string? AttachmentUrl { get; set; }

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
    DateTime? ReviewedAt,
    string? HomeworkTitle = null,
    DateTime? DueDate = null
);

public class SubmitHomeworkRequest
{
    [StringLength(500, ErrorMessage = "Đường dẫn bài nộp tối đa 500 ký tự")]
    public string? SubmissionUrl { get; set; } // Link Google Drive/Ảnh chụp bài làm

    [StringLength(500, ErrorMessage = "Ghi chú học sinh tối đa 500 ký tự")]
    public string? StudentNote { get; set; }
}

public class ReviewHomeworkRequest
{
    [Required(ErrorMessage = "Trạng thái chấm bài là bắt buộc")]
    [RegularExpression("^(Reviewed|Pending)$", ErrorMessage = "Trạng thái chấm bài chỉ nhận: Reviewed (Đã chấm), Pending (Yêu cầu làm lại)")]
    public string Status { get; set; } = "Reviewed";

    [StringLength(1000, ErrorMessage = "Nhận xét của giáo viên tối đa 1000 ký tự")]
    public string? TeacherFeedback { get; set; }
}
