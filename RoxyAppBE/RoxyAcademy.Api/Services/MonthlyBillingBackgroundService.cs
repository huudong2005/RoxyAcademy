using Microsoft.EntityFrameworkCore;
using RoxyAcademy.Api.Data;
using RoxyAcademy.Api.Models;

namespace RoxyAcademy.Api.Services;

/// <summary>
/// Job chạy nền mỗi ngày lúc 06:00 (UTC+7) để tự động tạo khoản thu học phí tháng hiện tại
/// và gửi thông báo tổng hợp cho SuperAdmin / BranchManager.
/// </summary>
public class MonthlyBillingBackgroundService(
    IServiceScopeFactory scopeFactory,
    ILogger<MonthlyBillingBackgroundService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var isFirstSchedule = true;

        while (!stoppingToken.IsCancellationRequested)
        {
            var vnNow = DateTime.UtcNow.AddHours(7);
            var todaySixAm = vnNow.Date.AddHours(6);
            var nextRunVn = vnNow < todaySixAm ? todaySixAm : todaySixAm.AddDays(1);
            var delay = nextRunVn - vnNow;

            if (isFirstSchedule)
            {
                logger.LogInformation(
                    "MonthlyBillingBackgroundService đã đăng ký và đang chờ tới {NextRunVn:dd/MM/yyyy HH:mm:ss} (UTC+7).",
                    nextRunVn);
                isFirstSchedule = false;
            }
            else
            {
                logger.LogInformation(
                    "MonthlyBillingBackgroundService đang chờ tới lần chạy tiếp theo lúc {NextRunVn:dd/MM/yyyy HH:mm:ss} (UTC+7).",
                    nextRunVn);
            }

            try
            {
                if (delay > TimeSpan.Zero)
                {
                    await Task.Delay(delay, stoppingToken);
                }

                await RunMonthlyBillingAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(
                    ex,
                    "Lỗi khi chạy MonthlyBillingBackgroundService lúc {VnNow:dd/MM/yyyy HH:mm:ss} (UTC+7).",
                    DateTime.UtcNow.AddHours(7));
            }
        }
    }

    private async Task RunMonthlyBillingAsync(CancellationToken stoppingToken)
    {
        using var scope = scopeFactory.CreateScope();
        var monthlyBillingService = scope.ServiceProvider.GetRequiredService<IMonthlyBillingService>();
        var db = scope.ServiceProvider.GetRequiredService<RoxyDbContext>();

        var summary = await monthlyBillingService.GenerateMonthlyTuitionsAsync(
            null,
            null,
            "SuperAdmin",
            null,
            stoppingToken);

        var recipients = await db.Users
            .AsNoTracking()
            .Where(u => u.IsActive && (u.Role == "SuperAdmin" || u.Role == "BranchManager"))
            .Select(u => new { u.Id, u.Role, u.BranchId })
            .ToListAsync(stoppingToken);

        var title = $"Đã tạo khoản thu tháng {summary.Month:D2}/{summary.Year}";
        var nowUtc = DateTime.UtcNow;
        var notifications = new List<Notification>();

        foreach (var user in recipients)
        {
            if (user.Role == "SuperAdmin")
            {
                var uncreatedClasses = summary.UncreatedItems
                    .Select(x => x.ClassName)
                    .Distinct();

                notifications.Add(new Notification
                {
                    UserId = user.Id,
                    Title = title,
                    Body = BuildNotificationBody(
                        summary.CreatedCount,
                        summary.TotalCreatedAmount,
                        summary.SkippedDuplicateCount,
                        summary.UncreatedCount,
                        uncreatedClasses),
                    Type = "Tuition",
                    RefId = null,
                    IsRead = false,
                    CreatedAt = nowUtc
                });
            }
            else if (user.Role == "BranchManager" && user.BranchId.HasValue)
            {
                var branchId = user.BranchId.Value;
                var branchCreated = summary.CreatedItems.Where(x => x.BranchId == branchId).ToList();
                var branchUncreated = summary.UncreatedItems.Where(x => x.BranchId == branchId).ToList();
                var branchSkipped = summary.SkippedDuplicateCountByBranch?.GetValueOrDefault(branchId) ?? 0;

                notifications.Add(new Notification
                {
                    UserId = user.Id,
                    Title = title,
                    Body = BuildNotificationBody(
                        branchCreated.Count,
                        branchCreated.Sum(x => x.Amount),
                        branchSkipped,
                        branchUncreated.Count,
                        branchUncreated.Select(x => x.ClassName).Distinct()),
                    Type = "Tuition",
                    RefId = null,
                    IsRead = false,
                    CreatedAt = nowUtc
                });
            }
        }

        if (notifications.Count > 0)
        {
            db.Notifications.AddRange(notifications);
            await db.SaveChangesAsync(stoppingToken);
        }

        var executedAtVn = DateTime.UtcNow.AddHours(7);
        logger.LogInformation(
            "MonthlyBillingBackgroundService hoàn tất lúc {ExecutedAtVn:dd/MM/yyyy HH:mm:ss} (UTC+7) | Period={Month:D2}/{Year} | Created={CreatedCount} | Skipped={SkippedCount} | Uncreated={UncreatedCount} | AdminNotificationsSent={NotifCount}",
            executedAtVn,
            summary.Month,
            summary.Year,
            summary.CreatedCount,
            summary.SkippedDuplicateCount,
            summary.UncreatedCount,
            notifications.Count);
    }

    private static string BuildNotificationBody(
        int createdCount,
        decimal totalAmount,
        int skippedCount,
        int uncreatedCount,
        IEnumerable<string> uncreatedClassNames)
    {
        var body = $"Đã tạo {createdCount} khoản thu (tổng {totalAmount:N0} đ), bỏ qua {skippedCount} khoản trùng, chưa tạo {uncreatedCount} học viên do chưa thiết lập học phí.";
        if (uncreatedCount > 0)
        {
            var classes = uncreatedClassNames.Where(c => !string.IsNullOrWhiteSpace(c)).ToList();
            if (classes.Count > 0)
            {
                body += $" Các lớp cần kiểm tra: {string.Join(", ", classes)}.";
            }
        }

        return body.Length > 1000 ? body[..997] + "..." : body;
    }
}
