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
public class NotificationsController(RoxyDbContext db) : ControllerBase
{
    private int UserId => User.GetUserId();

    // 1. Lấy danh sách thông báo của MÌNH (có thể lọc chưa đọc)
    [HttpGet]
    public async Task<ActionResult<IEnumerable<NotificationDto>>> GetMyNotifications([FromQuery] bool? unreadOnly)
    {
        var q = db.Notifications.Where(n => n.UserId == UserId);

        if (unreadOnly == true)
            q = q.Where(n => !n.IsRead);

        var list = await q.OrderByDescending(n => n.CreatedAt)
            .Select(n => new NotificationDto(
                n.Id, n.UserId, n.Title, n.Body, n.Type, n.RefId, n.IsRead, n.ReadAt, n.CreatedAt
            )).ToListAsync();

        return Ok(list);
    }

    // 2. Tạo thông báo (Chủ yếu để Admin test. Trong thực tế, hệ thống sẽ tự động gọi logic này khi có sự kiện xảy ra)
    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> CreateNotification(CreateNotificationRequest req)
    {
        var notif = new Notification
        {
            UserId = req.UserId,
            Title = req.Title.Trim(),
            Body = req.Body?.Trim(),
            Type = req.Type,
            RefId = req.RefId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        db.Notifications.Add(notif);
        await db.SaveChangesAsync();

        return Ok(new { message = "Tạo thông báo thành công!", id = notif.Id });
    }

    // 3. Đánh dấu 1 thông báo là đã đọc
    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(long id)
    {
        var notif = await db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == UserId);
        if (notif == null) return NotFound();

        if (!notif.IsRead)
        {
            notif.IsRead = true;
            notif.ReadAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }

        return NoContent();
    }

    // 4. Đánh dấu TẤT CẢ thông báo là đã đọc
    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var unreadNotifs = await db.Notifications
            .Where(n => n.UserId == UserId && !n.IsRead)
            .ToListAsync();

        foreach (var notif in unreadNotifs)
        {
            notif.IsRead = true;
            notif.ReadAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
        return Ok(new { message = "Đã đánh dấu đọc tất cả!" });
    }
}