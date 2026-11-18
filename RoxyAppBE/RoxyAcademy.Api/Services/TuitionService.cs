using Microsoft.EntityFrameworkCore;
using RoxyAcademy.Api.Data;
using RoxyAcademy.Api.Dtos;
using RoxyAcademy.Api.Models;

namespace RoxyAcademy.Api.Services;

public record CreateTuitionResult(
    bool Success,
    int StatusCode,
    string? ErrorMessage = null,
    Tuition? Tuition = null
);

public interface ITuitionService
{
    Task<CreateTuitionResult> CreateTuitionAsync(
        CreateTuitionRequest req,
        string? actorRole = null,
        int? actorBranchId = null,
        CancellationToken cancellationToken = default);
}

public class TuitionService(RoxyDbContext db) : ITuitionService
{
    public async Task<CreateTuitionResult> CreateTuitionAsync(
        CreateTuitionRequest req,
        string? actorRole = null,
        int? actorBranchId = null,
        CancellationToken cancellationToken = default)
    {
        if (req.Amount < 0 || req.Discount < 0)
            return new CreateTuitionResult(false, StatusCodes.Status400BadRequest, "Số tiền học phí và số tiền giảm giá phải lớn hơn hoặc bằng 0.");

        if (req.Discount > req.Amount)
            return new CreateTuitionResult(false, StatusCodes.Status400BadRequest, "Số tiền giảm giá không được lớn hơn tổng số tiền học phí.");

        var student = await db.Students.FindAsync([req.StudentId], cancellationToken);
        if (student == null)
            return new CreateTuitionResult(false, StatusCodes.Status400BadRequest, "Học viên không tồn tại.");

        var managerBranchId = actorBranchId ?? -1;
        if (actorRole == "BranchManager")
        {
            if (req.BranchId != managerBranchId || student.BranchId != managerBranchId)
                return new CreateTuitionResult(false, StatusCodes.Status403Forbidden, "Không thể tạo khoản thu cho học viên hoặc cơ sở khác.");
        }

        var branchExists = await db.Branches.AnyAsync(b => b.Id == req.BranchId && b.IsActive, cancellationToken);
        if (!branchExists)
            return new CreateTuitionResult(false, StatusCodes.Status400BadRequest, "Chi nhánh không tồn tại hoặc đã ngừng hoạt động.");

        // Bắt lỗi ràng buộc FK_Tuitions_Enrolled nếu có gắn ClassId
        if (req.ClassId.HasValue)
        {
            var enrollment = await db.StudentClasses
                .Include(sc => sc.Class)
                .FirstOrDefaultAsync(sc => sc.StudentId == req.StudentId && sc.ClassId == req.ClassId, cancellationToken);

            if (enrollment == null)
                return new CreateTuitionResult(false, StatusCodes.Status400BadRequest, "Học viên chưa ghi danh vào lớp này, không thể tạo hóa đơn học phí gắn với lớp.");

            if (actorRole == "BranchManager" && enrollment.Class.BranchId != managerBranchId)
                return new CreateTuitionResult(false, StatusCodes.Status403Forbidden, "Lớp học không thuộc cơ sở đang quản lý.");
        }

        var tuition = new Tuition
        {
            StudentId = req.StudentId,
            ClassId = req.ClassId,
            BranchId = req.BranchId,
            Title = req.Title.Trim(),
            Amount = req.Amount,
            Discount = req.Discount,
            DueDate = req.DueDate,
            IsCancelled = false,
            Note = req.Note?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        db.Tuitions.Add(tuition);
        await db.SaveChangesAsync(cancellationToken);

        return new CreateTuitionResult(true, StatusCodes.Status201Created, Tuition: tuition);
    }
}
