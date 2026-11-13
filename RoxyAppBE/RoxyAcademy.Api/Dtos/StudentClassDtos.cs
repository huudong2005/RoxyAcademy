using System.ComponentModel.DataAnnotations;

namespace RoxyAcademy.Api.Dtos;

public record StudentClassDto(
    int Id,
    int StudentId,
    string? StudentName,
    int ClassId,
    string? ClassName,
    string Status,
    DateTime RegisteredAt,
    int? ApprovedBy,
    string? ApprovedByName,
    DateTime? ApprovedAt,
    string? Note
);

public class CreateStudentClassRequest
{
    [Required]
    public int StudentId { get; set; }

    [Required]
    public int ClassId { get; set; }

    [StringLength(500)]
    public string? Note { get; set; }
}

public class UpdateStudentClassStatusRequest
{
    [Required(ErrorMessage = "Trạng thái là bắt buộc")]
    [RegularExpression("^(Pending|Active|Dropped|Finished|Rejected)$", ErrorMessage = "Trạng thái không hợp lệ")]
    public string Status { get; set; } = "";

    [StringLength(500)]
    public string? Note { get; set; }
}