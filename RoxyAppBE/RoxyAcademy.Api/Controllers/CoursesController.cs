using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RoxyAcademy.Api.Data;
using RoxyAcademy.Api.Dtos;
using RoxyAcademy.Api.Models;

namespace RoxyAcademy.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class CoursesController(RoxyDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CourseDto>>> GetCourses()
    {
        var courses = await db.Courses
            .Select(c => new CourseDto(c.Id, c.CourseCode, c.CourseName, c.Description, c.TotalSessions, c.DefaultFee, c.IsActive, c.CreatedAt))
            .ToListAsync();

        return Ok(courses);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CourseDto>> GetCourse(int id)
    {
        var c = await db.Courses.FindAsync(id);
        if (c == null) return NotFound(new { message = "Không tìm thấy khóa học này." });

        return Ok(new CourseDto(c.Id, c.CourseCode, c.CourseName, c.Description, c.TotalSessions, c.DefaultFee, c.IsActive, c.CreatedAt));
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<CourseDto>> CreateCourse(CreateCourseRequest req)
    {
        if (!string.IsNullOrEmpty(req.CourseCode))
        {
            bool isExist = await db.Courses.AnyAsync(c => c.CourseCode == req.CourseCode);
            if (isExist) return Conflict(new { message = "Mã khóa học này đã tồn tại trong hệ thống!" });
        }
        var course = new Course
        {
            CourseCode = req.CourseCode,
            CourseName = req.CourseName,
            Description = req.Description,
            TotalSessions = req.TotalSessions,
            DefaultFee = req.DefaultFee,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        db.Courses.Add(course);
        await db.SaveChangesAsync();

        var dto = new CourseDto(course.Id, course.CourseCode, course.CourseName, course.Description, course.TotalSessions, course.DefaultFee, course.IsActive, course.CreatedAt);
        return CreatedAtAction(nameof(GetCourse), new { id = course.Id }, dto);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateCourse(int id, UpdateCourseRequest req)
    {
        var course = await db.Courses.FindAsync(id);
        if (course == null) return NotFound(new { message = "Không tìm thấy khóa học này." });

        if (!string.IsNullOrEmpty(req.CourseCode) && req.CourseCode != course.CourseCode)
        {
            bool isExist = await db.Courses.AnyAsync(c => c.CourseCode == req.CourseCode);
            if (isExist) return Conflict(new { message = "Mã khóa học này đã bị trùng với một khóa học khác!" });
        }
        course.CourseCode = req.CourseCode;
        course.CourseName = req.CourseName;
        course.Description = req.Description;
        course.TotalSessions = req.TotalSessions;
        course.DefaultFee = req.DefaultFee;
        course.IsActive = req.IsActive;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> DeleteCourse(int id)
    {
        var course = await db.Courses.FindAsync(id);
        if (course == null) return NotFound(new { message = "Không tìm thấy khóa học này." });

        course.IsActive = false;
        await db.SaveChangesAsync();

        return NoContent();
    }
}