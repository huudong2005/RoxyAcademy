using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoxyAcademy.Api.Dtos;
using RoxyAcademy.Api.Extensions;
using RoxyAcademy.Api.Services;

namespace RoxyAcademy.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "SuperAdmin,BranchManager")]
public class BillingController(IMonthlyBillingService monthlyBillingService) : ControllerBase
{
    private string Role => User.GetRole();

    [HttpPost("generate-monthly")]
    [ProducesResponseType(typeof(MonthlyBillingSummaryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<MonthlyBillingSummaryDto>> GenerateMonthly(CancellationToken cancellationToken)
    {
        int? branchId = null;
        if (Role == "BranchManager")
        {
            branchId = User.GetBranchId();
            if (!branchId.HasValue)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Tài khoản quản lý chưa được gán chi nhánh." });
        }

        GenerateMonthlyBillingRequest? req = null;
        if (Request.Body != Stream.Null)
        {
            using var reader = new StreamReader(Request.Body);
            var body = await reader.ReadToEndAsync(cancellationToken);
            if (!string.IsNullOrWhiteSpace(body))
            {
                try
                {
                    req = JsonSerializer.Deserialize<GenerateMonthlyBillingRequest>(
                        body,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                }
                catch (JsonException)
                {
                    return BadRequest(new { message = "Dữ liệu JSON không hợp lệ." });
                }
            }
        }

        try
        {
            var summary = await monthlyBillingService.GenerateMonthlyTuitionsAsync(
                req?.Month,
                req?.Year,
                Role,
                branchId,
                cancellationToken);

            return Ok(summary);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
