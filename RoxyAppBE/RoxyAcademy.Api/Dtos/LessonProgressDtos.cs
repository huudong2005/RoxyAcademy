using System.ComponentModel.DataAnnotations;

namespace RoxyAcademy.Api.Dtos;

public record LessonProgressDto(
    int Id,
    int ClassId,
    string? ClassName,
    int? ScheduleId,
    DateOnly LessonDate,
    string? Title,
    string Content,
    int CreatedBy,
    string? CreatedByName,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public class CreateLessonProgressRequest
{
    [Required] public int ClassId { get; set; }

    public int? ScheduleId { get; set; }

    [Required] public DateOnly LessonDate { get; set; }

    [StringLength(200)] public string? Title { get; set; }

    [Required(ErrorMessage = "Nội dung bài giảng là bắt buộc")]
    public string Content { get; set; } = "";
}

public class UpdateLessonProgressRequest
{
    public int? ScheduleId { get; set; }

    [Required] public DateOnly LessonDate { get; set; }

    [StringLength(200)] public string? Title { get; set; }

    [Required(ErrorMessage = "Nội dung bài giảng là bắt buộc")]
    public string Content { get; set; } = "";
}