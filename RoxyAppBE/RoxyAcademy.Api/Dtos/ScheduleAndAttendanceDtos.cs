using System.ComponentModel.DataAnnotations;

namespace RoxyAcademy.Api.Dtos;

// --- DTO CHO LỊCH HỌC (SCHEDULE) ---
public record ScheduleDto(
    int Id,
    int ClassId,
    string? ClassName,
    int? BranchId,
    string? BranchName,
    int? MainTeacherId,
    string? MainTeacherName,
    DateOnly StudyDate,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string? Room,
    int? SubstituteTeacherId,
    string? SubstituteTeacherName,
    string Status,
    string? Note
);

public class CreateScheduleRequest
{
    [Required(ErrorMessage = "Mã lớp học là bắt buộc.")]
    public int ClassId { get; set; }

    [Required(ErrorMessage = "Ngày học là bắt buộc.")]
    public DateOnly StudyDate { get; set; }

    [Required(ErrorMessage = "Giờ bắt đầu là bắt buộc.")]
    public TimeOnly StartTime { get; set; }

    [Required(ErrorMessage = "Giờ kết thúc là bắt buộc.")]
    public TimeOnly EndTime { get; set; }

    [StringLength(50, ErrorMessage = "Phòng học không vượt quá 50 ký tự.")]
    public string? Room { get; set; }

    public int? SubstituteTeacherId { get; set; }

    [StringLength(500, ErrorMessage = "Ghi chú không vượt quá 500 ký tự.")]
    public string? Note { get; set; }
}

public class UpdateScheduleRequest
{
    [Required(ErrorMessage = "Ngày học là bắt buộc.")]
    public DateOnly StudyDate { get; set; }

    [Required(ErrorMessage = "Giờ bắt đầu là bắt buộc.")]
    public TimeOnly StartTime { get; set; }

    [Required(ErrorMessage = "Giờ kết thúc là bắt buộc.")]
    public TimeOnly EndTime { get; set; }

    [StringLength(50, ErrorMessage = "Phòng học không vượt quá 50 ký tự.")]
    public string? Room { get; set; }

    public int? SubstituteTeacherId { get; set; }

    [Required(ErrorMessage = "Trạng thái buổi học là bắt buộc.")]
    [RegularExpression("^(Scheduled|Completed|Cancelled)$", ErrorMessage = "Trạng thái chỉ nhận: Scheduled (Đã lên lịch), Completed (Đã hoàn thành), hoặc Cancelled (Đã hủy)")]
    public string Status { get; set; } = "Scheduled";

    [StringLength(500, ErrorMessage = "Ghi chú không vượt quá 500 ký tự.")]
    public string? Note { get; set; }
}

// --- DTO CHO ĐIỂM DANH (ATTENDANCE) ---
public record AttendanceDto(
    long? Id,
    int ScheduleId,
    int StudentId,
    string? StudentName,
    string? Gender,
    DateOnly? Dob,
    string? Status,
    string? Note,
    int? MarkedBy,
    string? MarkedByName,
    DateTime? MarkedAt
);

// DTO dùng để cập nhật điểm danh hàng loạt (Bulk Update)
public class BulkAttendanceRequest
{
    [Required(ErrorMessage = "Mã buổi học là bắt buộc.")]
    public int ScheduleId { get; set; }

    [Required(ErrorMessage = "Danh sách điểm danh là bắt buộc.")]
    public List<AttendanceRecord> Records { get; set; } = new();
}

public class AttendanceRecord
{
    [Required(ErrorMessage = "Mã học viên là bắt buộc.")]
    public int StudentId { get; set; }

    [Required(ErrorMessage = "Trạng thái điểm danh là bắt buộc.")]
    [RegularExpression("^(Present|Late|ExcusedAbsent|UnexcusedAbsent)$",
        ErrorMessage = "Trạng thái chỉ nhận: Present (Có mặt), Late (Đi muộn), ExcusedAbsent (Nghỉ có phép), hoặc UnexcusedAbsent (Nghỉ không phép)")]
    public string Status { get; set; } = "Present";

    [StringLength(300, ErrorMessage = "Ghi chú điểm danh không vượt quá 300 ký tự.")]
    public string? Note { get; set; }
}
