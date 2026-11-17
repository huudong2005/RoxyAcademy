using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoxyAcademy.Api.Data;
using RoxyAcademy.Api.Models;

namespace RoxyAcademy.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SeedController(RoxyDbContext db) : ControllerBase
{
    private static readonly (string BranchName, string Address, string Phone)[] DefaultBranches =
    [
        ("Roxy Academy - Cơ sở 1 (Bình Trưng)", "P. Bình Trưng, TP.HCM", "0326538824"),
        ("Roxy Academy - Cơ sở 2 (Bình Trưng)", "P. Bình Trưng, TP.HCM", "0326538824")
    ];

    private static readonly string[] DefaultCourses =
    [
        "Tiền tiểu học",
        "Luyện chữ đẹp",
        "Tư duy logic",
        "Gia sư Cấp 1-2-3",
        "Lớp Học Vẽ",
        "Dạy trẻ phổ tự kỷ",
        "Kỹ năng sống Cấp 1-2-3",
        "Lớp Giáo Dục Giới Tính"
    ];

    /// <summary>
    /// Seed danh mục tối thiểu (2 chi nhánh + 8 khóa học) theo cơ chế idempotent.
    /// </summary>
    [HttpPost("catalog")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> SeedCatalog()
    {
        var branchesAdded = 0;
        var coursesAdded = 0;
        var now = DateTime.UtcNow;

        foreach (var (branchName, address, phone) in DefaultBranches)
        {
            if (!await db.Branches.AnyAsync(b => b.BranchName == branchName))
            {
                db.Branches.Add(new Branch
                {
                    BranchName = branchName,
                    Address = address,
                    Phone = phone,
                    IsActive = true,
                    CreatedAt = now
                });
                branchesAdded++;
            }
        }

        foreach (var courseName in DefaultCourses)
        {
            if (!await db.Courses.AnyAsync(c => c.CourseName == courseName))
            {
                db.Courses.Add(new Course
                {
                    CourseName = courseName,
                    IsActive = true,
                    CreatedAt = now
                });
                coursesAdded++;
            }
        }

        if (branchesAdded > 0 || coursesAdded > 0)
            await db.SaveChangesAsync();

        var totalBranches = await db.Branches.CountAsync();
        var totalCourses = await db.Courses.CountAsync();

        return Ok(new { branchesAdded, coursesAdded, totalBranches, totalCourses });
    }
}
