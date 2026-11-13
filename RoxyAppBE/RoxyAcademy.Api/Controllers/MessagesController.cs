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
public class MessagesController(RoxyDbContext db) : ControllerBase
{
	private string Role => User.GetRole();
	private int UserId => User.GetUserId();

	[HttpGet]
	public async Task<ActionResult<IEnumerable<MessageDto>>> GetMessages([FromQuery] string type = "inbox")
	{
		var q = db.Messages
			.Include(m => m.Sender)
			.Include(m => m.Receiver)
			.Include(m => m.Class)
			.Include(m => m.Student)
			.AsQueryable();

		var normalizedType = type?.Trim().ToLowerInvariant() ?? "inbox";
		var branchId = User.GetBranchId() ?? -1;

		// 1. Inbox: Tin nhắn gửi đích danh cho mình
		if (normalizedType == "inbox")
		{
			q = q.Where(m => m.ReceiverId == UserId);
		}
		// 2. Outbox: Tin nhắn do mình gửi đi
		else if (normalizedType == "outbox")
		{
			q = q.Where(m => m.SenderId == UserId);
		}
		// 3. Class: Thông báo chung của các lớp mình liên quan
		else if (normalizedType == "class")
		{
			q = Role switch
			{
				"SuperAdmin" => q.Where(m => m.ClassId != null),
				"BranchManager" => q.Where(m => m.ClassId != null && m.Class!.BranchId == branchId),
				"Teacher" => q.Where(m => m.ClassId != null && m.Class!.TeacherId == UserId),
				"Parent" => q.Where(m => m.ClassId != null && db.StudentClasses.Any(sc => sc.ClassId == m.ClassId && sc.Student!.ParentId == UserId)),
				"Student" => q.Where(m => m.ClassId != null && db.StudentClasses.Any(sc => sc.ClassId == m.ClassId && sc.Student!.UserId == UserId)),
				_ => q.Where(_ => false)
			};
		}
		// 4. Mọi trường hợp khác (type=all, type lạ, default): PHẢI lọc theo user hiện tại, không bao giờ trả toàn bộ tin nhắn
		else
		{
			q = Role switch
			{
				"SuperAdmin" => q.Where(m => m.ReceiverId == UserId || m.SenderId == UserId || m.ClassId != null),
				"BranchManager" => q.Where(m => m.ReceiverId == UserId || m.SenderId == UserId || (m.ClassId != null && m.Class!.BranchId == branchId)),
				"Teacher" => q.Where(m => m.ReceiverId == UserId || m.SenderId == UserId || (m.ClassId != null && m.Class!.TeacherId == UserId)),
				"Parent" => q.Where(m => m.ReceiverId == UserId || m.SenderId == UserId || (m.ClassId != null && db.StudentClasses.Any(sc => sc.ClassId == m.ClassId && sc.Student!.ParentId == UserId))),
				"Student" => q.Where(m => m.ReceiverId == UserId || m.SenderId == UserId || (m.ClassId != null && db.StudentClasses.Any(sc => sc.ClassId == m.ClassId && sc.Student!.UserId == UserId))),
				_ => q.Where(m => m.ReceiverId == UserId || m.SenderId == UserId)
			};
		}

		var list = await q.OrderByDescending(m => m.CreatedAt)
			.Select(m => new MessageDto(
				m.Id,
				m.SenderId, m.Sender!.FullName,
				m.ReceiverId, m.Receiver != null ? m.Receiver.FullName : null,
				m.ClassId, m.Class != null ? m.Class.ClassName : null,
				m.StudentId, m.Student != null ? m.Student.FullName : null,
				m.Content, m.IsRead, m.ReadAt, m.CreatedAt
			)).ToListAsync();

		return Ok(list);
	}

	[HttpPost]
	public async Task<ActionResult<MessageDto>> SendMessage(SendMessageRequest req)
	{
		// 1. Kiểm tra không được để trống cả 2
		if (!req.ReceiverId.HasValue && !req.ClassId.HasValue)
			return BadRequest(new { message = "Vui lòng chọn người nhận cá nhân hoặc lớp học để gửi tin nhắn." });

		// 2. Thêm logic bắt lỗi CK_Messages_Target: Không được gửi cùng lúc cho cả cá nhân và tập thể lớp
		if (req.ReceiverId.HasValue && req.ClassId.HasValue)
			return BadRequest(new { message = "Tin nhắn chỉ được gửi đích danh (ReceiverId) HOẶC gửi chung cho lớp (ClassId), không thể chọn cả hai." });

		var message = new Message
		{
			SenderId = UserId,
			ReceiverId = req.ReceiverId,
			ClassId = req.ClassId,
			StudentId = req.StudentId, // Thường chỉ dùng khi tag 1 học sinh vào thông báo lớp
			Content = req.Content.Trim(),
			IsRead = false,
			CreatedAt = DateTime.UtcNow
		};

		db.Messages.Add(message);
		await db.SaveChangesAsync();

		return Ok(new { message = "Gửi tin nhắn thành công!", id = message.Id });
	}

	[HttpPut("{id}/read")]
	public async Task<IActionResult> MarkAsRead(long id)
	{
		var msg = await db.Messages.FindAsync(id);
		if (msg == null) return NotFound();

		// Chỉ người nhận đích danh mới được đánh dấu đã đọc
		if (msg.ReceiverId != UserId)
			return StatusCode(StatusCodes.Status403Forbidden);

		if (!msg.IsRead)
		{
			msg.IsRead = true;
			msg.ReadAt = DateTime.UtcNow;
			await db.SaveChangesAsync();
		}

		return NoContent();
	}
}