using System.ComponentModel.DataAnnotations;

namespace RoxyAcademy.Api.Dtos;

// Record dùng để trả dữ liệu về (Read)
public record BranchDto(int Id, string BranchName, string Address, string? Phone, bool IsActive, DateTime CreatedAt);

// Class dùng để nhận dữ liệu khi Thêm mới (Create)
public class CreateBranchRequest
{
	[Required(ErrorMessage = "Tên cơ sở là bắt buộc"), StringLength(150)]
	public string BranchName { get; set; } = "";

	[Required(ErrorMessage = "Địa chỉ là bắt buộc"), StringLength(300)]
	public string Address { get; set; } = "";

	[StringLength(20)]
	public string? Phone { get; set; }
}

// Class dùng để nhận dữ liệu khi Cập nhật (Update)
public class UpdateBranchRequest
{
	[Required(ErrorMessage = "Tên cơ sở là bắt buộc"), StringLength(150)]
	public string BranchName { get; set; } = "";

	[Required(ErrorMessage = "Địa chỉ là bắt buộc"), StringLength(300)]
	public string Address { get; set; } = "";

	[StringLength(20)]
	public string? Phone { get; set; }

	public bool IsActive { get; set; }
}