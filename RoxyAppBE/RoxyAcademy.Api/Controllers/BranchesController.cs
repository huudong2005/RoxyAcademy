using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoxyAcademy.Api.Data;
using RoxyAcademy.Api.Dtos;
using RoxyAcademy.Api.Models;

namespace RoxyAcademy.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize] // Bắt buộc phải có token (đã đăng nhập) mới được gọi API trong này
public class BranchesController(RoxyDbContext db) : ControllerBase
{
	// 1. LẤY DANH SÁCH (READ ALL) - Ai đăng nhập cũng xem được
	[HttpGet]
	public async Task<ActionResult<IEnumerable<BranchDto>>> GetBranches()
	{
		var branches = await db.Branches
			.Select(b => new BranchDto(b.Id, b.BranchName, b.Address, b.Phone, b.IsActive, b.CreatedAt))
			.ToListAsync();

		return Ok(branches);
	}

	// 2. LẤY CHI TIẾT 1 CƠ SỞ (READ ONE)
	[HttpGet("{id}")]
	public async Task<ActionResult<BranchDto>> GetBranch(int id)
	{
		var b = await db.Branches.FindAsync(id);
		if (b == null) return NotFound(new { message = "Không tìm thấy cơ sở này." });

		return Ok(new BranchDto(b.Id, b.BranchName, b.Address, b.Phone, b.IsActive, b.CreatedAt));
	}

	// 3. THÊM MỚI (CREATE) - Chỉ SuperAdmin được làm
	[HttpPost]
	[Authorize(Roles = "SuperAdmin")]
	public async Task<ActionResult<BranchDto>> CreateBranch(CreateBranchRequest req)
	{
		var branch = new Branch
		{
			BranchName = req.BranchName,
			Address = req.Address,
			Phone = req.Phone,
			IsActive = true,
			CreatedAt = DateTime.UtcNow
		};

		db.Branches.Add(branch);
		await db.SaveChangesAsync();

		var dto = new BranchDto(branch.Id, branch.BranchName, branch.Address, branch.Phone, branch.IsActive, branch.CreatedAt);
		return CreatedAtAction(nameof(GetBranch), new { id = branch.Id }, dto);
	}

	// 4. CẬP NHẬT (UPDATE) - Chỉ SuperAdmin được làm
	[HttpPut("{id}")]
	[Authorize(Roles = "SuperAdmin")]
	public async Task<IActionResult> UpdateBranch(int id, UpdateBranchRequest req)
	{
		var branch = await db.Branches.FindAsync(id);
		if (branch == null) return NotFound(new { message = "Không tìm thấy cơ sở này." });

		branch.BranchName = req.BranchName;
		branch.Address = req.Address;
		branch.Phone = req.Phone;
		branch.IsActive = req.IsActive;

		await db.SaveChangesAsync();
		return NoContent(); // 204: Thành công nhưng không cần trả về body
	}

	// 5. XÓA (DELETE) - Xóa mềm (Soft Delete) - Chỉ SuperAdmin được làm
	[HttpDelete("{id}")]
	[Authorize(Roles = "SuperAdmin")]
	public async Task<IActionResult> DeleteBranch(int id)
	{
		var branch = await db.Branches.FindAsync(id);
		if (branch == null) return NotFound(new { message = "Không tìm thấy cơ sở này." });

		// Thay vì xóa cứng (Remove) có thể gây lỗi khóa ngoại, ta dùng xóa mềm (đổi trạng thái)
		branch.IsActive = false;
		await db.SaveChangesAsync();

		return NoContent();
	}
}