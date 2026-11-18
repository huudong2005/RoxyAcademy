using Microsoft.EntityFrameworkCore;
using RoxyAcademy.Api.Data;
using RoxyAcademy.Api.Dtos;
using RoxyAcademy.Api.Models;

namespace RoxyAcademy.Api.Services;

public interface IMonthlyBillingService
{
    Task<MonthlyBillingSummaryDto> GenerateMonthlyTuitionsAsync(
        int? month,
        int? year,
        string actorRole,
        int? actorBranchId,
        CancellationToken cancellationToken = default);
}

public class MonthlyBillingService(
    RoxyDbContext db,
    ITuitionService tuitionService,
    ILogger<MonthlyBillingService> logger) : IMonthlyBillingService
{
    public async Task<MonthlyBillingSummaryDto> GenerateMonthlyTuitionsAsync(
        int? month,
        int? year,
        string actorRole,
        int? actorBranchId,
        CancellationToken cancellationToken = default)
    {
        var vnNow = DateTime.UtcNow.AddHours(7);
        var targetMonth = month ?? vnNow.Month;
        var targetYear = year ?? vnNow.Year;

        if (targetMonth is < 1 or > 12)
            throw new ArgumentException("Tháng tính học phí phải nằm trong khoảng từ 1 đến 12.");

        if (targetYear is < 2000 or > 2100)
            throw new ArgumentException("Năm tính học phí phải nằm trong khoảng từ 2000 đến 2100.");

        var dueDate = new DateOnly(targetYear, targetMonth, DateTime.DaysInMonth(targetYear, targetMonth));

        var enrollmentsQuery = db.StudentClasses
            .Include(sc => sc.Student)
            .Include(sc => sc.Class)
                .ThenInclude(c => c.Course)
            .Where(sc => sc.Status == "Active" && sc.Class.Status != "Finished");

        if (actorRole == "BranchManager")
        {
            var managerBranchId = actorBranchId ?? -1;
            enrollmentsQuery = enrollmentsQuery.Where(sc => sc.Class.BranchId == managerBranchId);
        }

        var enrollments = await enrollmentsQuery
            .OrderBy(sc => sc.Class.BranchId)
            .ThenBy(sc => sc.ClassId)
            .ThenBy(sc => sc.StudentId)
            .ToListAsync(cancellationToken);

        // Chống tạo trùng: bất kỳ khoản thu nào (kể cả IsCancelled == true) có DueDate cùng tháng/năm
        var existingPairs = await db.Tuitions
            .Where(t => t.ClassId.HasValue && t.DueDate.Year == targetYear && t.DueDate.Month == targetMonth)
            .Select(t => new { t.StudentId, ClassId = t.ClassId!.Value })
            .ToListAsync(cancellationToken);

        var existingSet = existingPairs
            .Select(x => (x.StudentId, x.ClassId))
            .ToHashSet();

        var createdItems = new List<CreatedMonthlyTuitionItemDto>();
        var uncreatedItems = new List<UncreatedMonthlyTuitionItemDto>();
        var skippedDuplicateCount = 0;
        var skippedDuplicateCountByBranch = new Dictionary<int, int>();
        var note = $"Tự động tạo bởi hệ thống ngày {vnNow:dd/MM/yyyy}";

        foreach (var sc in enrollments)
        {
            if (existingSet.Contains((sc.StudentId, sc.ClassId)))
            {
                skippedDuplicateCount++;
                skippedDuplicateCountByBranch[sc.Class.BranchId] =
                    skippedDuplicateCountByBranch.GetValueOrDefault(sc.Class.BranchId) + 1;
                continue;
            }

            decimal? fee = sc.Class.TuitionFee ?? sc.Class.Course?.DefaultFee;
            if (!fee.HasValue)
            {
                uncreatedItems.Add(new UncreatedMonthlyTuitionItemDto(
                    sc.StudentId,
                    sc.Student.FullName,
                    sc.ClassId,
                    sc.Class.ClassName,
                    "Lớp và khóa học chưa thiết lập học phí.",
                    sc.Class.BranchId));
                continue;
            }

            if (fee.Value < 0)
            {
                uncreatedItems.Add(new UncreatedMonthlyTuitionItemDto(
                    sc.StudentId,
                    sc.Student.FullName,
                    sc.ClassId,
                    sc.Class.ClassName,
                    "Học phí thiết lập không hợp lệ (< 0).",
                    sc.Class.BranchId));
                continue;
            }

            var rawTitle = $"Học phí tháng {targetMonth:D2}/{targetYear} – {sc.Class.ClassName}";
            var title = rawTitle.Length > 200 ? rawTitle[..200] : rawTitle;

            var createReq = new CreateTuitionRequest
            {
                StudentId = sc.StudentId,
                ClassId = sc.ClassId,
                BranchId = sc.Class.BranchId,
                Title = title,
                Amount = fee.Value,
                Discount = 0m,
                DueDate = dueDate,
                Note = note
            };

            var createResult = await tuitionService.CreateTuitionAsync(createReq, actorRole, actorBranchId, cancellationToken);
            if (!createResult.Success || createResult.Tuition == null)
            {
                uncreatedItems.Add(new UncreatedMonthlyTuitionItemDto(
                    sc.StudentId,
                    sc.Student.FullName,
                    sc.ClassId,
                    sc.Class.ClassName,
                    createResult.ErrorMessage ?? "Không thể tạo khoản thu.",
                    sc.Class.BranchId));
                continue;
            }

            existingSet.Add((sc.StudentId, sc.ClassId));

            var tuition = createResult.Tuition;
            createdItems.Add(new CreatedMonthlyTuitionItemDto(
                tuition.Id,
                sc.StudentId,
                sc.Student.FullName,
                sc.ClassId,
                sc.Class.ClassName,
                tuition.BranchId,
                tuition.Title,
                tuition.Amount,
                tuition.DueDate));

            if (sc.Student.ParentId > 0)
            {
                try
                {
                    db.Notifications.Add(new Notification
                    {
                        UserId = sc.Student.ParentId,
                        Title = $"Học phí tháng {targetMonth:D2}/{targetYear}",
                        Body = $"Học phí tháng {targetMonth:D2}/{targetYear} lớp {sc.Class.ClassName} của học viên {sc.Student.FullName}: {tuition.Amount:N0} đ, hạn nộp {dueDate:dd/MM/yyyy}.",
                        Type = "Tuition",
                        RefId = tuition.Id,
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });
                    await db.SaveChangesAsync(cancellationToken);
                }
                catch (Exception ex)
                {
                    logger.LogWarning(
                        ex,
                        "Không thể tạo thông báo học phí tháng {Month:D2}/{Year} cho phụ huynh {ParentId} (TuitionId={TuitionId}).",
                        targetMonth,
                        targetYear,
                        sc.Student.ParentId,
                        tuition.Id);
                }
            }
        }

        var totalCreatedAmount = createdItems.Sum(x => x.Amount);
        var scopeLabel = actorRole == "BranchManager" ? $"BranchId={actorBranchId}" : "AllBranches";

        logger.LogInformation(
            "MonthlyBilling executed at {ExecutedAtVn:yyyy-MM-dd HH:mm:ss} (UTC+7) | Scope={Scope} | Period={Month:D2}/{Year} | Created={CreatedCount} | TotalAmount={TotalAmount} | SkippedDuplicate={SkippedCount} | Uncreated={UncreatedCount}",
            vnNow,
            scopeLabel,
            targetMonth,
            targetYear,
            createdItems.Count,
            totalCreatedAmount,
            skippedDuplicateCount,
            uncreatedItems.Count);

        return new MonthlyBillingSummaryDto(
            targetMonth,
            targetYear,
            dueDate,
            vnNow,
            createdItems.Count,
            totalCreatedAmount,
            createdItems,
            skippedDuplicateCount,
            uncreatedItems.Count,
            uncreatedItems,
            skippedDuplicateCountByBranch);
    }
}
