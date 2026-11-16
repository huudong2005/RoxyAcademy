using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoxyAcademy.Api.Data;
using RoxyAcademy.Api.Dtos;
using RoxyAcademy.Api.Extensions;
using RoxyAcademy.Api.Models;

namespace RoxyAcademy.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class GradesController(RoxyDbContext db) : ControllerBase
{
    private static readonly HashSet<string> AllowedExamTypes = new(StringComparer.Ordinal)
    {
        "Quiz", "Midterm", "Final", "Daily", "Other"
    };

    private string Role => User.GetRole();
    private int UserId => User.GetUserId();

    private static string? ValidateGradeInput(string? examType, decimal? score, decimal maxScore, string? teacherComment)
    {
        var normalizedType = examType?.Trim() ?? "";
        if (!AllowedExamTypes.Contains(normalizedType))
            return "Loại bài kiểm tra không hợp lệ. Chỉ chấp nhận: Quiz, Midterm, Final, Daily, Other.";

        if (maxScore <= 0)
            return "Thang điểm tối đa phải lớn hơn 0.";

        if (score.HasValue && (score.Value < 0 || score.Value > maxScore))
            return $"Điểm số phải nằm trong khoảng từ 0 đến {maxScore}.";

        if (!score.HasValue && string.IsNullOrWhiteSpace(teacherComment))
            return "Vui lòng nhập điểm số hoặc nhận xét của giáo viên.";

        return null;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<GradeDto>>> GetGrades(
        [FromQuery] int? classId,
        [FromQuery] int? studentId,
        [FromQuery] string? examType,
        [FromQuery] DateOnly? examDate)
    {
        var q = db.Grades
            .Include(g => g.StudentClass).ThenInclude(sc => sc.Student)
            .Include(g => g.StudentClass).ThenInclude(sc => sc.Class)
            .Include(g => g.GradedByNavigation)
            .AsQueryable();

        // Phân quyền dữ liệu theo vai trò & chi nhánh
        switch (Role)
        {
            case "SuperAdmin":
                break;
            case "BranchManager":
                var branchId = User.GetBranchId() ?? -1;
                q = q.Where(g => g.StudentClass!.Class!.BranchId == branchId);
                break;
            case "Teacher":
                q = q.Where(g => g.StudentClass!.Class!.TeacherId == UserId);
                break;
            case "Parent":
                q = q.Where(g => g.StudentClass!.Student!.ParentId == UserId);
                break;
            case "Student":
                q = q.Where(g => g.StudentClass!.Student!.UserId == UserId);
                break;
            default:
                return Forbid();
        }

        if (classId.HasValue) q = q.Where(g => g.ClassId == classId);
        if (studentId.HasValue) q = q.Where(g => g.StudentId == studentId);
        if (!string.IsNullOrWhiteSpace(examType))
        {
            var normalizedExamType = examType.Trim();
            q = q.Where(g => g.ExamType == normalizedExamType);
        }
        if (examDate.HasValue) q = q.Where(g => g.ExamDate == examDate.Value);

        var list = await q.OrderByDescending(g => g.ExamDate).ThenByDescending(g => g.CreatedAt)
            .Select(g => new GradeDto(
                g.Id, g.StudentId, g.StudentClass!.Student!.FullName,
                g.ClassId, g.StudentClass!.Class!.ClassName,
                g.ExamName, g.ExamType, g.ExamDate, g.Score, g.MaxScore, g.TeacherComment,
                g.GradedBy, g.GradedByNavigation != null ? g.GradedByNavigation.FullName : null,
                g.CreatedAt, g.UpdatedAt
            )).ToListAsync();

        return Ok(list);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]
    public async Task<ActionResult<GradeDto>> CreateGrade(CreateGradeRequest req)
    {
        // Kiểm tra xem Học viên có nằm trong Lớp này không (rất quan trọng để né lỗi khóa ngoại của StudentClass)
        var studentClass = await db.StudentClasses
            .Include(sc => sc.Class)
            .FirstOrDefaultAsync(sc => sc.StudentId == req.StudentId && sc.ClassId == req.ClassId);

        if (studentClass == null)
            return BadRequest(new { message = "Học viên chưa được ghi danh vào lớp này." });

        if (Role == "Teacher" && studentClass.Class!.TeacherId != UserId)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không phụ trách lớp này." });

        if (Role == "BranchManager" && studentClass.Class!.BranchId != User.GetBranchId())
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Không thể nhập điểm cho lớp học của cơ sở khác." });

        var validationError = ValidateGradeInput(req.ExamType, req.Score, req.MaxScore, req.TeacherComment);
        if (validationError != null)
            return BadRequest(new { message = validationError });

        var grade = new Grade
        {
            StudentId = req.StudentId,
            ClassId = req.ClassId,
            ExamName = req.ExamName.Trim(),
            ExamType = req.ExamType.Trim(),
            ExamDate = req.ExamDate,
            Score = req.Score,
            MaxScore = req.MaxScore,
            TeacherComment = string.IsNullOrWhiteSpace(req.TeacherComment) ? null : req.TeacherComment.Trim(),
            GradedBy = UserId,
            CreatedAt = DateTime.UtcNow
        };

        db.Grades.Add(grade);
        await db.SaveChangesAsync();

        return Ok(new { message = "Nhập điểm thành công!", id = grade.Id });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin,BranchManager,Teacher")]
    public async Task<IActionResult> UpdateGrade(int id, UpdateGradeRequest req)
    {
        var grade = await db.Grades
            .Include(g => g.StudentClass).ThenInclude(sc => sc.Class)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (grade == null) return NotFound(new { message = "Không tìm thấy điểm số này." });

        if (Role == "Teacher" && grade.StudentClass!.Class!.TeacherId != UserId)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không phụ trách lớp này." });

        if (Role == "BranchManager" && grade.StudentClass!.Class!.BranchId != User.GetBranchId())
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Không thể sửa điểm cho lớp học của cơ sở khác." });

        var validationError = ValidateGradeInput(req.ExamType, req.Score, req.MaxScore, req.TeacherComment);
        if (validationError != null)
            return BadRequest(new { message = validationError });

        grade.ExamName = req.ExamName.Trim();
        grade.ExamType = req.ExamType.Trim();
        grade.ExamDate = req.ExamDate;
        grade.Score = req.Score;
        grade.MaxScore = req.MaxScore;
        grade.TeacherComment = string.IsNullOrWhiteSpace(req.TeacherComment) ? null : req.TeacherComment.Trim();

        // Cập nhật lại người sửa điểm và thời gian sửa
        grade.GradedBy = UserId;
        grade.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return NoContent();
    }
}