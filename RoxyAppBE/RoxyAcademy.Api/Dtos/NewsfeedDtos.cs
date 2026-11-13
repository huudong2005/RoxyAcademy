using System.ComponentModel.DataAnnotations;

namespace RoxyAcademy.Api.Dtos;

public record NewsfeedDto(
    int Id,
    string Title,
    string Content,
    string? TitleEn,
    string? ContentEn,
    string? ImageUrl,
    string TargetAudience,
    int? BranchId,
    string? BranchName,
    bool IsPinned,
    bool IsPublished,
    int CreatedBy,
    string? CreatedByName,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public class CreateNewsfeedRequest
{
    [Required, StringLength(200)] public string Title { get; set; } = "";
    [Required] public string Content { get; set; } = "";

    [StringLength(200)] public string? TitleEn { get; set; }
    public string? ContentEn { get; set; }

    [StringLength(500)] public string? ImageUrl { get; set; }

    [Required]
    [RegularExpression("^(All|Student|Parent|Teacher|Staff)$", ErrorMessage = "Đối tượng chỉ nhận: All, Student, Parent, Teacher, Staff")]
    public string TargetAudience { get; set; } = "All";

    public int? BranchId { get; set; }
    public bool IsPinned { get; set; } = false;
    public bool IsPublished { get; set; } = true;
}

public class UpdateNewsfeedRequest
{
    [Required, StringLength(200)] public string Title { get; set; } = "";
    [Required] public string Content { get; set; } = "";

    [StringLength(200)] public string? TitleEn { get; set; }
    public string? ContentEn { get; set; }

    [StringLength(500)] public string? ImageUrl { get; set; }

    [Required]
    [RegularExpression("^(All|Student|Parent|Teacher|Staff)$")]
    public string TargetAudience { get; set; } = "All";

    public int? BranchId { get; set; }
    public bool IsPinned { get; set; }
    public bool IsPublished { get; set; }
}