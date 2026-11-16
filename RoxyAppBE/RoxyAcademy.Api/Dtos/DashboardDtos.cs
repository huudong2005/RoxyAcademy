namespace RoxyAcademy.Api.Dtos;

public record DashboardSummaryDto(
    DashboardOverviewDto Overview,
    DashboardTuitionDto? Tuition,
    DashboardTodayAttendanceDto TodayAttendance,
    List<DashboardTodayScheduleDto> TodaySchedules
);

public record DashboardOverviewDto(
    int ActiveStudents,
    int OngoingClasses,
    int UpcomingClasses,
    int? ActiveTeachers,
    int PendingLeaveRequests
);

public record DashboardTuitionDto(
    int Month,
    int Year,
    decimal TotalExpected,
    decimal TotalPaid,
    decimal TotalRemaining
);

public record DashboardTodayAttendanceDto(
    string Date,
    int TotalExpected,
    int Present,
    int Late,
    int ExcusedAbsent,
    int UnexcusedAbsent
);

public record DashboardTodayScheduleDto(
    int Id,
    int ClassId,
    string ClassName,
    int BranchId,
    string BranchName,
    string? Room,
    string StartTime,
    string EndTime,
    int? TeacherId,
    string? TeacherName,
    bool IsSubstitute,
    string Status
);
