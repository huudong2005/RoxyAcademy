namespace RoxyAcademy.Api.Dtos;

public class GenerateMonthlyBillingRequest
{
    public int? Month { get; set; }
    public int? Year { get; set; }
}

public record CreatedMonthlyTuitionItemDto(
    int TuitionId,
    int StudentId,
    string StudentName,
    int ClassId,
    string ClassName,
    int BranchId,
    string Title,
    decimal Amount,
    DateOnly DueDate
);

public record UncreatedMonthlyTuitionItemDto(
    int StudentId,
    string StudentName,
    int ClassId,
    string ClassName,
    string Reason
);

public record MonthlyBillingSummaryDto(
    int Month,
    int Year,
    DateOnly DueDate,
    DateTime ExecutedAtVn,
    int CreatedCount,
    decimal TotalCreatedAmount,
    List<CreatedMonthlyTuitionItemDto> CreatedItems,
    int SkippedDuplicateCount,
    int UncreatedCount,
    List<UncreatedMonthlyTuitionItemDto> UncreatedItems
);
