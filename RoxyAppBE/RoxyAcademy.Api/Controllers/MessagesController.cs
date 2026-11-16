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

	private IQueryable<User> GetAllowedReceiverUsersQuery()
	{
		var q = db.Users.Where(u => u.IsActive && u.Id != UserId);
		var userBranchId = User.GetBranchId();

		return Role switch
		{
			"SuperAdmin" => q,
			"BranchManager" => userBranchId.HasValue
				? q.Where(u => u.BranchId == userBranchId.Value ||
				               (u.Role == "Parent" && db.Students.Any(s => s.ParentId == u.Id && s.BranchId == userBranchId.Value)))
				: q.Where(_ => false),
			"Teacher" => q.Where(u =>
				u.Role == "SuperAdmin" ||
				(u.Role == "BranchManager" && userBranchId.HasValue && u.BranchId == userBranchId.Value) ||
				db.StudentClasses.Any(sc =>
					sc.Class.TeacherId == UserId &&
					(sc.Student.ParentId == u.Id || (sc.Student.UserId != null && sc.Student.UserId == u.Id)))),
			"Parent" => q.Where(u =>
				u.Role == "SuperAdmin" ||
				(u.Role == "BranchManager" && u.BranchId.HasValue &&
				 db.Students.Any(s => s.ParentId == UserId && s.BranchId == u.BranchId.Value)) ||
				db.StudentClasses.Any(sc =>
					sc.Student.ParentId == UserId &&
					sc.Class.TeacherId == u.Id)),
			"Student" => q.Where(u =>
				u.Role == "SuperAdmin" ||
				(u.Role == "BranchManager" && u.BranchId.HasValue &&
				 (db.Students.Any(s => s.UserId == UserId && s.BranchId == u.BranchId.Value) ||
				  (userBranchId.HasValue && u.BranchId.Value == userBranchId.Value))) ||
				db.StudentClasses.Any(sc =>
					sc.Student.UserId == UserId &&
					sc.Class.TeacherId == u.Id)),
			_ => q.Where(_ => false)
		};
	}

	private IQueryable<Class> GetAllowedClassesQuery()
	{
		var q = db.Classes.AsQueryable();
		var userBranchId = User.GetBranchId();

		return Role switch
		{
			"SuperAdmin" => q,
			"BranchManager" => userBranchId.HasValue
				? q.Where(c => c.BranchId == userBranchId.Value)
				: q.Where(_ => false),
			"Teacher" => q.Where(c => c.TeacherId == UserId),
			"Parent" => q.Where(c => db.StudentClasses.Any(sc => sc.ClassId == c.Id && sc.Student.ParentId == UserId)),
			"Student" => q.Where(c => db.StudentClasses.Any(sc => sc.ClassId == c.Id && sc.Student.UserId == UserId)),
			_ => q.Where(_ => false)
		};
	}

	[HttpGet("recipients")]
	public async Task<ActionResult<MessageRecipientsDto>> GetRecipients()
	{
		var users = await GetAllowedReceiverUsersQuery()
			.OrderBy(u => u.Role)
			.ThenBy(u => u.FullName)
			.Select(u => new RecipientUserDto(
				u.Id,
				u.FullName,
				u.Role,
				u.BranchId,
				u.Branch != null ? u.Branch.BranchName : null
			))
			.ToListAsync();

		var classes = await GetAllowedClassesQuery()
			.OrderBy(c => c.ClassName)
			.Select(c => new RecipientClassDto(
				c.Id,
				c.ClassName,
				c.BranchId,
				c.Branch.BranchName
			))
			.ToListAsync();

		return Ok(new MessageRecipientsDto(users, classes));
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

		// 3. Kiểm tra tồn tại và phân quyền người gửi theo phạm vi
		if (req.ReceiverId.HasValue)
		{
			var receiver = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == req.ReceiverId.Value);
			if (receiver == null || !receiver.IsActive)
				return BadRequest(new { message = "Người nhận không tồn tại hoặc đã ngừng hoạt động." });

			var canSendToUser = await GetAllowedReceiverUsersQuery().AnyAsync(u => u.Id == req.ReceiverId.Value);
			if (!canSendToUser)
				return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền gửi tin nhắn cho người nhận này." });
		}

		if (req.ClassId.HasValue)
		{
			var classExists = await db.Classes.AnyAsync(c => c.Id == req.ClassId.Value);
			if (!classExists)
				return BadRequest(new { message = "Lớp học không tồn tại." });

			var canSendToClass = await GetAllowedClassesQuery().AnyAsync(c => c.Id == req.ClassId.Value);
			if (!canSendToClass)
				return StatusCode(StatusCodes.Status403Forbidden, new { message = "Bạn không có quyền gửi tin nhắn cho lớp học này." });
		}

		if (req.StudentId.HasValue)
		{
			var studentExists = await db.Students.AnyAsync(s => s.Id == req.StudentId.Value);
			if (!studentExists)
				return BadRequest(new { message = "Học viên không tồn tại." });
		}

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