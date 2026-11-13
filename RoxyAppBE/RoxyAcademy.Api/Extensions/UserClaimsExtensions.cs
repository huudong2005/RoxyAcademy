using System.Security.Claims;

namespace RoxyAcademy.Api.Extensions;

public static class UserClaimsExtensions
{
    public static int GetUserId(this ClaimsPrincipal user) =>
        int.Parse(user.FindFirstValue("sub")!);

    public static string GetRole(this ClaimsPrincipal user) =>
        user.FindFirstValue("role") ?? "";

    public static int? GetBranchId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue("branchId"), out var id) ? id : null;
}