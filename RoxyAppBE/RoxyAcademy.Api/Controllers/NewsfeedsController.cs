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
public class NewsfeedsController(RoxyDbContext db) : ControllerBase
{
    private string Role => User.GetRole();
    private int UserId => User.GetUserId();
    private bool IsStaff => Role is "SuperAdmin" or "BranchManager";

    [HttpGet]
    [AllowAnonymous] // Có thể cho phép khách vãng lai xem bảng tin public nếu muốn (tùy chọn)
    public async Task<ActionResult<IEnumerable<NewsfeedDto>>> GetNewsfeeds([FromQuery] int? branchId)
    {
        var q = db.Newsfeeds
            .Include(n => n.Branch)
            .Include(n => n.CreatedByNavigation)
            .AsQueryable();

        // 1. Lọc theo trạng thái xuất bản
        if (!IsStaff)
        {
            q = q.Where(n => n.IsPublished == true); // Chỉ nội bộ quản lý mới thấy bài Nháp

            // 2. Lọc theo đối tượng (TargetAudience)
            q = q.Where(n => n.TargetAudience == "All" || n.TargetAudience == Role);
        }

        // 3. Lọc theo chi nhánh
        if (Role == "BranchManager")
        {
            var userBranchId = User.GetBranchId();
            // Quản lý cơ sở thấy bài viết chung (null) và bài của cơ sở mình
            q = q.Where(n => n.BranchId == null || n.BranchId == userBranchId);
        }
        if (branchId.HasValue) q = q.Where(n => n.BranchId == branchId);

        // Sắp xếp: Ưu tiên bài được Ghim (IsPinned = true) lên trên cùng, sau đó mới tính ngày tạo
        var list = await q.OrderByDescending(n => n.IsPinned).ThenByDescending(n => n.CreatedAt)
            .Select(n => new NewsfeedDto(
                n.Id, n.Title, n.Content, n.TitleEn, n.ContentEn, n.ImageUrl,
                n.TargetAudience, n.BranchId, n.Branch != null ? n.Branch.BranchName : null,
                n.IsPinned, n.IsPublished,
                n.CreatedBy, n.CreatedByNavigation!.FullName, // Dùng dấu !
                n.CreatedAt, n.UpdatedAt
            )).ToListAsync();

        return Ok(list);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,BranchManager")] // Chỉ quản lý mới được đăng bài
    public async Task<ActionResult<NewsfeedDto>> CreateNewsfeed(CreateNewsfeedRequest req)
    {
        if (Role == "BranchManager" && req.BranchId != User.GetBranchId())
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Không thể đăng tin cho chi nhánh khác." });

        var newsfeed = new Newsfeed
        {
            Title = req.Title.Trim(),
            Content = req.Content.Trim(),
            TitleEn = req.TitleEn?.Trim(),
            ContentEn = req.ContentEn?.Trim(),
            ImageUrl = req.ImageUrl,
            TargetAudience = req.TargetAudience,
            BranchId = req.BranchId,
            IsPinned = req.IsPinned,
            IsPublished = req.IsPublished,
            CreatedBy = UserId,
            CreatedAt = DateTime.UtcNow
        };

        db.Newsfeeds.Add(newsfeed);
        await db.SaveChangesAsync();

        return Ok(new { message = "Đăng bản tin thành công!", id = newsfeed.Id });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin,BranchManager")]
    public async Task<IActionResult> UpdateNewsfeed(int id, UpdateNewsfeedRequest req)
    {
        var newsfeed = await db.Newsfeeds.FindAsync(id);
        if (newsfeed == null) return NotFound(new { message = "Không tìm thấy bản tin này." });

        if (Role == "BranchManager" && newsfeed.BranchId != User.GetBranchId())
            return StatusCode(StatusCodes.Status403Forbidden);

        newsfeed.Title = req.Title.Trim();
        newsfeed.Content = req.Content.Trim();
        newsfeed.TitleEn = req.TitleEn?.Trim();
        newsfeed.ContentEn = req.ContentEn?.Trim();
        newsfeed.ImageUrl = req.ImageUrl;
        newsfeed.TargetAudience = req.TargetAudience;
        newsfeed.BranchId = req.BranchId;
        newsfeed.IsPinned = req.IsPinned;
        newsfeed.IsPublished = req.IsPublished;
        newsfeed.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin,BranchManager")]
    public async Task<IActionResult> DeleteNewsfeed(int id)
    {
        var newsfeed = await db.Newsfeeds.FindAsync(id);
        if (newsfeed == null) return NotFound();

        if (Role == "BranchManager" && newsfeed.BranchId != User.GetBranchId())
            return StatusCode(StatusCodes.Status403Forbidden);

        db.Newsfeeds.Remove(newsfeed);
        await db.SaveChangesAsync();
        return NoContent();
    }
}