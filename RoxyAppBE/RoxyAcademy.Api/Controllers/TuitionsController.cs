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
public class TuitionsController(RoxyDbContext db) : ControllerBase
{
    private string Role => User.GetRole();
    private int UserId => User.GetUserId();

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TuitionDto>>> GetTuitions(
        [FromQuery] string? search,
        [FromQuery] int? studentId,
        [FromQuery] int? classId,
        [FromQuery] int? branchId,
        [FromQuery] string? status)
    {
        // Giáo viên không được xem học phí
        if (Role == "Teacher")
            return Forbid();

        var q = db.Tuitions
            .Include(t => t.Student)
            .Include(t => t.Branch)
            .Include(t => t.StudentClass)
                .ThenInclude(sc => sc!.Class)
            .AsQueryable();

        switch (Role)
        {
            case "SuperAdmin":
                if (branchId.HasValue) q = q.Where(t => t.BranchId == branchId.Value);
                break;
            case "BranchManager":
                var bId = User.GetBranchId() ?? -1;
                q = q.Where(t => t.BranchId == bId);
                break;
            case "Parent":
                q = q.Where(t => t.Student.ParentId == UserId);
                if (branchId.HasValue) q = q.Where(t => t.BranchId == branchId.Value);
                break;
            case "Student":
                q = q.Where(t => t.Student.UserId == UserId);
                if (branchId.HasValue) q = q.Where(t => t.BranchId == branchId.Value);
                break;
            default:
                return Forbid();
        }

        if (studentId.HasValue) q = q.Where(t => t.StudentId == studentId.Value);
        if (classId.HasValue) q = q.Where(t => t.ClassId == classId.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            q = q.Where(t => t.Title.Contains(term)
                          || t.Student.FullName.Contains(term)
                          || t.StudentId.ToString().Contains(term)
                          || (t.StudentClass != null && t.StudentClass.Class.ClassName.Contains(term)));
        }

        // Tính ngày hiện tại theo giờ Việt Nam (UTC+7)
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));

        if (!string.IsNullOrWhiteSpace(status))
        {
            var s = status.Trim().ToLowerInvariant();
            switch (s)
            {
                case "paid":
                    q = q.Where(t => !t.IsCancelled &&
                        t.Payments.Where(p => p.Status == "Confirmed").Sum(p => (decimal?)p.Amount ?? 0m) >= (t.Amount - t.Discount));
                    break;
                case "partial":
                case "partiallypaid":
                    q = q.Where(t => !t.IsCancelled &&
                        t.Payments.Where(p => p.Status == "Confirmed").Sum(p => (decimal?)p.Amount ?? 0m) > 0m &&
                        t.Payments.Where(p => p.Status == "Confirmed").Sum(p => (decimal?)p.Amount ?? 0m) < (t.Amount - t.Discount));
                    break;
                case "unpaid":
                    q = q.Where(t => !t.IsCancelled &&
                        t.Payments.Where(p => p.Status == "Confirmed").Sum(p => (decimal?)p.Amount ?? 0m) == 0m);
                    break;
                case "overdue":
                    q = q.Where(t => !t.IsCancelled &&
                        t.Payments.Where(p => p.Status == "Confirmed").Sum(p => (decimal?)p.Amount ?? 0m) < (t.Amount - t.Discount) &&
                        t.DueDate < today);
                    break;
                case "cancelled":
                    q = q.Where(t => t.IsCancelled);
                    break;
            }
        }

        var items = await q.OrderByDescending(t => t.CreatedAt)
            .Select(t => new
            {
                t.Id,
                t.StudentId,
                StudentName = t.Student.FullName,
                t.ClassId,
                ClassName = t.StudentClass != null ? t.StudentClass.Class.ClassName : null,
                t.BranchId,
                BranchName = t.Branch.BranchName,
                t.Title,
                t.Amount,
                t.Discount,
                t.DueDate,
                t.IsCancelled,
                t.Note,
                t.CreatedAt,
                PaidAmount = t.Payments.Where(p => p.Status == "Confirmed").Sum(p => (decimal?)p.Amount) ?? 0m
            })
            .ToListAsync();

        var list = items.Select(t =>
        {
            var netAmount = t.Amount - t.Discount;
            var remainingAmount = Math.Max(0m, netAmount - t.PaidAmount);
            var isOverdue = !t.IsCancelled && remainingAmount > 0m && t.DueDate < today;
            var paymentStatus = t.IsCancelled ? "Cancelled"
                : (t.PaidAmount >= netAmount) ? "Paid"
                : isOverdue ? "Overdue"
                : (t.PaidAmount > 0m) ? "PartiallyPaid"
                : "Unpaid";

            return new TuitionDto(
                t.Id,
                t.StudentId,
                t.StudentName,
                t.ClassId,
                t.ClassName,
                t.BranchId,
                t.BranchName,
                t.Title,
                t.Amount,
                t.Amount,
                t.Discount,
                netAmount,
                t.PaidAmount,
                remainingAmount,
                paymentStatus,
                isOverdue,
                t.DueDate,
                t.IsCancelled,
                t.Note,
                t.CreatedAt
            );
        }).ToList();

        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TuitionDto>> GetTuition(int id)
    {
        // Giáo viên không được xem học phí
        if (Role == "Teacher")
            return Forbid();

        var t = await db.Tuitions
            .Include(t => t.Student)
            .Include(t => t.Branch)
            .Include(t => t.StudentClass).ThenInclude(sc => sc!.Class)
            .Where(t => t.Id == id)
            .Select(t => new
            {
                t.Id,
                t.StudentId,
                StudentName = t.Student.FullName,
                StudentParentId = t.Student.ParentId,
                StudentUserId = t.Student.UserId,
                t.ClassId,
                ClassName = t.StudentClass != null ? t.StudentClass.Class.ClassName : null,
                t.BranchId,
                BranchName = t.Branch.BranchName,
                t.Title,
                t.Amount,
                t.Discount,
                t.DueDate,
                t.IsCancelled,
                t.Note,
                t.CreatedAt,
                PaidAmount = t.Payments.Where(p => p.Status == "Confirmed").Sum(p => (decimal?)p.Amount) ?? 0m
            })
            .FirstOrDefaultAsync();

        if (t == null) return NotFound(new { message = "Không tìm thấy khoản thu này." });

        // Học viên chỉ được xem học phí của chính mình
        if (Role == "Student" && t.StudentUserId != UserId)
            return Forbid();

        // Chặn phụ huynh xem học phí con người khác
        if (Role == "Parent" && t.StudentParentId != UserId)
            return Forbid();

        // Quản lý cơ sở chỉ được xem học phí cơ sở của mình
        if (Role == "BranchManager" && t.BranchId != (User.GetBranchId() ?? -1))
            return Forbid();

        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
        var netAmount = t.Amount - t.Discount;
        var remainingAmount = Math.Max(0m, netAmount - t.PaidAmount);
        var isOverdue = !t.IsCancelled && remainingAmount > 0m && t.DueDate < today;
        var paymentStatus = t.IsCancelled ? "Cancelled"
            : (t.PaidAmount >= netAmount) ? "Paid"
            : isOverdue ? "Overdue"
            : (t.PaidAmount > 0m) ? "PartiallyPaid"
            : "Unpaid";

        return Ok(new TuitionDto(
            t.Id,
            t.StudentId,
            t.StudentName,
            t.ClassId,
            t.ClassName,
            t.BranchId,
            t.BranchName,
            t.Title,
            t.Amount,
            t.Amount,
            t.Discount,
            netAmount,
            t.PaidAmount,
            remainingAmount,
            paymentStatus,
            isOverdue,
            t.DueDate,
            t.IsCancelled,
            t.Note,
            t.CreatedAt
        ));
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,BranchManager")]
    public async Task<ActionResult> CreateTuition(CreateTuitionRequest req)
    {
        if (req.Amount < 0 || req.Discount < 0)
            return BadRequest(new { message = "Số tiền học phí và số tiền giảm giá phải lớn hơn hoặc bằng 0." });

        if (req.Discount > req.Amount)
            return BadRequest(new { message = "Số tiền giảm giá không được lớn hơn tổng số tiền học phí." });

        var student = await db.Students.FindAsync(req.StudentId);
        if (student == null)
            return BadRequest(new { message = "Học viên không tồn tại." });

        var managerBranchId = User.GetBranchId() ?? -1;
        if (Role == "BranchManager")
        {
            if (req.BranchId != managerBranchId || student.BranchId != managerBranchId)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Không thể tạo khoản thu cho học viên hoặc cơ sở khác." });
        }

        var branchExists = await db.Branches.AnyAsync(b => b.Id == req.BranchId && b.IsActive);
        if (!branchExists)
            return BadRequest(new { message = "Chi nhánh không tồn tại hoặc đã ngừng hoạt động." });

        // Bắt lỗi ràng buộc FK_Tuitions_Enrolled nếu có gắn ClassId
        if (req.ClassId.HasValue)
        {
            var enrollment = await db.StudentClasses.Include(sc => sc.Class)
                .FirstOrDefaultAsync(sc => sc.StudentId == req.StudentId && sc.ClassId == req.ClassId);

            if (enrollment == null)
                return BadRequest(new { message = "Học viên chưa ghi danh vào lớp này, không thể tạo hóa đơn học phí gắn với lớp." });

            if (Role == "BranchManager" && enrollment.Class.BranchId != managerBranchId)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Lớp học không thuộc cơ sở đang quản lý." });
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
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTuition), new { id = tuition.Id }, new { id = tuition.Id, message = "Tạo khoản thu học phí thành công!" });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin,BranchManager")]
    public async Task<IActionResult> UpdateTuition(int id, UpdateTuitionRequest req)
    {
        var tuition = await db.Tuitions.FindAsync(id);
        if (tuition == null)
            return NotFound(new { message = "Không tìm thấy khoản thu này." });

        if (Role == "BranchManager" && tuition.BranchId != (User.GetBranchId() ?? -1))
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Không có quyền chỉnh sửa khoản thu của cơ sở khác." });

        if (req.Amount < 0 || req.Discount < 0)
            return BadRequest(new { message = "Số tiền học phí và giảm giá phải lớn hơn hoặc bằng 0." });

        if (req.Discount > req.Amount)
            return BadRequest(new { message = "Số tiền giảm giá không được lớn hơn tổng số tiền học phí." });

        // Kiểm tra số tiền đã thanh toán để tránh overpay khi giảm Amount
        var paidAmount = await db.Payments
            .Where(p => p.TuitionId == id && p.Status == "Confirmed")
            .SumAsync(p => (decimal?)p.Amount) ?? 0m;

        var netAmount = req.Amount - req.Discount;
        if (netAmount < paidAmount)
        {
            return BadRequest(new { 
                message = $"Số tiền phải thu sau giảm giá ({netAmount:N0} đ) không được nhỏ hơn tổng số tiền đã thanh toán ({paidAmount:N0} đ)." 
            });
        }

        tuition.Title = req.Title.Trim();
        tuition.Amount = req.Amount;
        tuition.Discount = req.Discount;
        tuition.DueDate = req.DueDate;
        tuition.IsCancelled = req.IsCancelled;
        tuition.Note = req.Note?.Trim();

        await db.SaveChangesAsync();
        return Ok(new { message = "Cập nhật khoản thu thành công!" });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin,BranchManager")]
    public async Task<IActionResult> DeleteTuition(int id)
    {
        var tuition = await db.Tuitions.FindAsync(id);
        if (tuition == null)
            return NotFound(new { message = "Không tìm thấy khoản thu này." });

        if (Role == "BranchManager" && tuition.BranchId != (User.GetBranchId() ?? -1))
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Không có quyền xóa khoản thu của cơ sở khác." });

        var hasPayments = await db.Payments.AnyAsync(p => p.TuitionId == id);
        if (hasPayments)
        {
            return BadRequest(new { message = "Không thể xóa khoản học phí đã có lịch sử thanh toán. Bạn có thể chọn Hủy khoản thu (IsCancelled = true)." });
        }

        db.Tuitions.Remove(tuition);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
