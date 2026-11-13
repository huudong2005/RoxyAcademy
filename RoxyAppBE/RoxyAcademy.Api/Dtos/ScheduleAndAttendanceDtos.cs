using System.ComponentModel.DataAnnotations;

namespace RoxyAcademy.Api.Dtos;

// --- DTO CHO LỊCH HỌC (SCHEDULE) ---
public record ScheduleDto(
    int Id,
    int ClassId,
    string? ClassName,
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
    [Required] public int ClassId { get; set; }
    [Required] public DateOnly StudyDate { get; set; }
    [Required] public TimeOnly StartTime { get; set; }
    [Required] public TimeOnly EndTime { get; set; }
    [StringLength(100)] public string? Room { get; set; }
    public int? SubstituteTeacherId { get; set; }
    [StringLength(500)] public string? Note { get; set; }
}

public class UpdateScheduleRequest
{
    [Required] public DateOnly StudyDate { get; set; }
    [Required] public TimeOnly StartTime { get; set; }
    [Required] public TimeOnly EndTime { get; set; }
    [StringLength(100)] public string? Room { get; set; }
    public int? SubstituteTeacherId { get; set; }
    [Required][RegularExpression("^(Scheduled|Completed|Cancelled)$")] public string Status { get; set; } = "Scheduled";
    [StringLength(500)] public string? Note { get; set; }
}

// --- DTO CHO ĐIỂM DANH (ATTENDANCE) ---
public record AttendanceDto(
    long Id,
    int ScheduleId,
    int StudentId,
    string? StudentName,
    string Status,
    string? Note,
    int? MarkedBy,
    string? MarkedByName,
    DateTime MarkedAt
);

// DTO dùng để cập nhật điểm danh hàng loạt (Bulk Update)
public class BulkAttendanceRequest
{
    [Required] public int ScheduleId { get; set; }
    [Required] public List<AttendanceRecord> Records { get; set; } = new();
}

public class AttendanceRecord
{
    [Required] public int StudentId { get; set; }

    [Required]
    [RegularExpression("^(Present|Absent|Late|Excused)$", ErrorMessage = "Chỉ nhận: Present (Có mặt), Absent (Vắng), Late (Trễ), Excused (Có phép)")]
    public string Status { get; set; } = "Present";

    [StringLength(200)] public string? Note { get; set; }
}