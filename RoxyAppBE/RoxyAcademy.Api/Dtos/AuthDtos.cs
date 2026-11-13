using System.ComponentModel.DataAnnotations;

namespace RoxyAcademy.Api.Dtos;

public class LoginRequest
{
    [Required, StringLength(15)]
    public string PhoneNumber { get; set; } = "";

    [Required, StringLength(100)]
    public string Password { get; set; } = "";
}

public record UserInfo(int Id, string FullName, string Role, int? BranchId, string PreferredLanguage);

public record LoginResponse(string AccessToken, DateTime ExpiresAt, UserInfo User);