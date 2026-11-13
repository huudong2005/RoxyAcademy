namespace RoxyAcademy.Api.Dtos;

// Kết quả phân trang dùng chung cho mọi danh sách
public record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);