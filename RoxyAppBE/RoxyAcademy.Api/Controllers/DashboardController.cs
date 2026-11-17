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
public class DashboardController(RoxyDbContext db) : ControllerBase
{
    private string Role => User.GetRole();
    private int UserId => User.GetUserId();
    private int UserBranchId => User.GetBranchId() ?? -1;

    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryDto>> GetSummary()
    {
        if (Role is not ("SuperAdmin" or "BranchManager" or "Teacher" or "Parent" or "Student"))
            return Forbid();

        var vnNow = DateTime.UtcNow.AddHours(7);
        var today = DateOnly.FromDateTime(vnNow);
        var month = vnNow.Month;
        var year = vnNow.Year;

        var activeStudents = await VisibleStudentsQuery().CountAsync(s => s.Status == "Active");

        var visibleClasses = VisibleClassesQuery();
        var ongoingClasses = await visibleClasses.CountAsync(c => c.Status == "Ongoing");
        var upcomingClasses = await visibleClasses.CountAsync(c => c.Status == "Upcoming");

        int? activeTeachers = Role switch
        {
            "SuperAdmin" => await db.Users.CountAsync(u => u.Role == "Teacher" && u.IsActive),
            "BranchManager" => await db.Users.CountAsync(u => u.Role == "Teacher" && u.BranchId == UserBranchId && u.IsActive),
            _ => null
        };

        var pendingLeaveRequests = await VisibleLeaveRequestsQuery().CountAsync(lr => lr.Status == "Pending");

        var overview = new DashboardOverviewDto(
            activeStudents,
            ongoingClasses,
            upcomingClasses,
            activeTeachers,
            pendingLeaveRequests
        );

        DashboardTuitionDto? tuition = null;
        if (Role != "Teacher")
        {
            var tuitionRows = await VisibleTuitionsQuery()
                .Where(t => !t.IsCancelled && t.DueDate.Month == month && t.DueDate.Year == year)
                .Select(t => new
                {
                    NetAmount = t.Amount - t.Discount,
                    PaidAmount = t.Payments.Where(p => p.Status == "Confirmed").Sum(p => (decimal?)p.Amount) ?? 0m
                })
                .ToListAsync();

            var totalExpectedTuition = tuitionRows.Sum(x => x.NetAmount);
            var totalPaidTuition = tuitionRows.Sum(x => x.PaidAmount);
            var totalRemainingTuition = tuitionRows.Sum(x => Math.Max(0m, x.NetAmount - x.PaidAmount));

            var overdueRows = await VisibleTuitionsQuery()
                .Where(t => !t.IsCancelled && t.DueDate < today)
                .Select(t => new
                {
                    NetAmount = t.Amount - t.Discount,
                    PaidAmount = t.Payments.Where(p => p.Status == "Confirmed").Sum(p => (decimal?)p.Amount) ?? 0m
                })
                .Where(x => x.PaidAmount < x.NetAmount)
                .ToListAsync();

            var overdueTuitionCount = overdueRows.Count;
            var overdueTuitionAmount = overdueRows.Sum(x => Math.Max(0m, x.NetAmount - x.PaidAmount));

            tuition = new DashboardTuitionDto(
                month,
                year,
                totalExpectedTuition,
                totalPaidTuition,
                totalRemainingTuition,
                overdueTuitionCount,
                overdueTuitionAmount
            );
        }

        var todayScheduleRows = await VisibleTodaySchedulesQuery(today)
            .OrderBy(s => s.StartTime)
            .ThenBy(s => s.Id)
            .Select(s => new
            {
                s.Id,
                s.ClassId,
                s.Class.ClassName,
                s.Class.BranchId,
                s.Class.Branch.BranchName,
                s.Room,
                s.StartTime,
                s.EndTime,
                MainTeacherId = s.Class.TeacherId,
                MainTeacherName = s.Class.User != null ? s.Class.User.FullName : null,
                s.SubstituteTeacherId,
                SubstituteTeacherName = s.User != null ? s.User.FullName : null,
                s.Status
            })
            .ToListAsync();

        var todaySchedules = todayScheduleRows
            .Select(s => new DashboardTodayScheduleDto(
                s.Id,
                s.ClassId,
                s.ClassName,
                s.BranchId,
                s.BranchName,
                s.Room,
                s.StartTime.ToString("HH:mm"),
                s.EndTime.ToString("HH:mm"),
                s.SubstituteTeacherId ?? s.MainTeacherId,
                s.SubstituteTeacherId != null ? s.SubstituteTeacherName : s.MainTeacherName,
                s.SubstituteTeacherId != null,
                s.Status
            ))
            .ToList();

        var totalExpectedAttendance = 0;
        var present = 0;
        var late = 0;
        var excusedAbsent = 0;
        var unexcusedAbsent = 0;

        if (todayScheduleRows.Count > 0)
        {
            var todayClassIds = todayScheduleRows.Select(s => s.ClassId).Distinct().ToList();
            var enrollmentsQ = db.StudentClasses
                .Where(sc => todayClassIds.Contains(sc.ClassId) && sc.Status == "Active");

            if (Role == "Parent")
                enrollmentsQ = enrollmentsQ.Where(sc => sc.Student.ParentId == UserId);
            else if (Role == "Student")
                enrollmentsQ = enrollmentsQ.Where(sc => sc.Student.UserId == UserId);

            var countByClass = await enrollmentsQ
                .GroupBy(sc => sc.ClassId)
                .Select(g => new { ClassId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.ClassId, x => x.Count);

            totalExpectedAttendance = todayScheduleRows.Sum(s => countByClass.GetValueOrDefault(s.ClassId, 0));

            var todayScheduleIds = todayScheduleRows.Select(s => s.Id).ToList();
            var attQ = db.Attendances.Where(a => todayScheduleIds.Contains(a.ScheduleId));

            if (Role == "Parent")
                attQ = attQ.Where(a => a.StudentClass.Student.ParentId == UserId);
            else if (Role == "Student")
                attQ = attQ.Where(a => a.StudentClass.Student.UserId == UserId);

            var attCounts = await attQ
                .GroupBy(a => a.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Status, x => x.Count);

            present = attCounts.GetValueOrDefault("Present", 0);
            late = attCounts.GetValueOrDefault("Late", 0);
            excusedAbsent = attCounts.GetValueOrDefault("ExcusedAbsent", 0);
            unexcusedAbsent = attCounts.GetValueOrDefault("UnexcusedAbsent", 0);
        }

        var todayAttendance = new DashboardTodayAttendanceDto(
            today.ToString("yyyy-MM-dd"),
            totalExpectedAttendance,
            present,
            late,
            excusedAbsent,
            unexcusedAbsent
        );

        return Ok(new DashboardSummaryDto(
            overview,
            tuition,
            todayAttendance,
            todaySchedules
        ));
    }

    private IQueryable<Student> VisibleStudentsQuery()
    {
        var q = db.Students.AsQueryable();
        return Role switch
        {
            "SuperAdmin" => q,
            "BranchManager" => q.Where(s => s.BranchId == UserBranchId),
            "Teacher" => q.Where(s => db.StudentClasses.Any(sc =>
                sc.StudentId == s.Id && sc.Status == "Active" &&
                db.Classes.Any(c => c.Id == sc.ClassId && c.TeacherId == UserId))),
            "Parent" => q.Where(s => s.ParentId == UserId),
            "Student" => q.Where(s => s.UserId == UserId),
            _ => q.Where(_ => false)
        };
    }

    private IQueryable<Class> VisibleClassesQuery()
    {
        var q = db.Classes.AsQueryable();
        return Role switch
        {
            "SuperAdmin" => q,
            "BranchManager" => q.Where(c => c.BranchId == UserBranchId),
            "Teacher" => q.Where(c => c.TeacherId == UserId),
            "Parent" => q.Where(c => db.StudentClasses.Any(sc => sc.ClassId == c.Id && sc.Student!.ParentId == UserId)),
            "Student" => q.Where(c => db.StudentClasses.Any(sc => sc.ClassId == c.Id && sc.Student!.UserId == UserId)),
            _ => q.Where(_ => false)
        };
    }

    private IQueryable<LeaveRequest> VisibleLeaveRequestsQuery()
    {
        var q = db.LeaveRequests.AsQueryable();
        return Role switch
        {
            "SuperAdmin" => q,
            "BranchManager" => q.Where(lr =>
                (lr.Class != null && lr.Class.BranchId == UserBranchId) ||
                (lr.Student != null && lr.Student.BranchId == UserBranchId) ||
                (lr.User != null && lr.User.BranchId == UserBranchId)),
            "Teacher" => q.Where(lr =>
                (lr.TeacherId == UserId || (lr.RequesterType == "Teacher" && lr.RequestedBy == UserId)) ||
                (lr.RequesterType == "Student" && lr.Class != null && lr.Class.TeacherId == UserId)),
            "Parent" => q.Where(lr =>
                lr.RequesterType == "Student" && lr.Student != null && lr.Student.ParentId == UserId),
            "Student" => q.Where(lr =>
                lr.RequesterType == "Student" && lr.Student != null && (lr.Student.UserId == UserId || lr.RequestedBy == UserId)),
            _ => q.Where(_ => false)
        };
    }

    private IQueryable<Tuition> VisibleTuitionsQuery()
    {
        var q = db.Tuitions.AsQueryable();
        return Role switch
        {
            "SuperAdmin" => q,
            "BranchManager" => q.Where(t => t.BranchId == UserBranchId),
            "Parent" => q.Where(t => t.Student.ParentId == UserId),
            "Student" => q.Where(t => t.Student.UserId == UserId),
            _ => q.Where(_ => false)
        };
    }

    private IQueryable<Schedule> VisibleTodaySchedulesQuery(DateOnly today)
    {
        var q = db.Schedules.Where(s => s.StudyDate == today);
        return Role switch
        {
            "SuperAdmin" => q,
            "BranchManager" => q.Where(s => s.Class.BranchId == UserBranchId),
            "Teacher" => q.Where(s => s.Class.TeacherId == UserId || s.SubstituteTeacherId == UserId),
            "Parent" => q.Where(s => db.StudentClasses.Any(sc =>
                sc.ClassId == s.ClassId && sc.Status == "Active" && sc.Student.ParentId == UserId)),
            "Student" => q.Where(s => db.StudentClasses.Any(sc =>
                sc.ClassId == s.ClassId && sc.Status == "Active" && sc.Student.UserId == UserId)),
            _ => q.Where(_ => false)
        };
    }
}
