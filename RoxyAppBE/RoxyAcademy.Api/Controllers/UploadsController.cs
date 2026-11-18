using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace RoxyAcademy.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class UploadsController(IWebHostEnvironment env) : ControllerBase
{
    private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5MB

    private static readonly HashSet<string> AllowedFolders = new(StringComparer.Ordinal)
    {
        "payments",
        "newsfeed",
        "general"
    };

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.Ordinal)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    };

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.Ordinal)
    {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp"
    };

    [HttpPost("image")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UploadImage(
        [FromForm] IFormFile? file,
        [FromForm] string? folder = null,
        [FromQuery(Name = "folder")] string? folderQuery = null,
        CancellationToken cancellationToken = default)
    {
        var rawFolder = !string.IsNullOrWhiteSpace(folder) ? folder : folderQuery;
        var safeFolder = string.IsNullOrWhiteSpace(rawFolder)
            ? "general"
            : rawFolder.Trim().ToLowerInvariant();

        if (!AllowedFolders.Contains(safeFolder))
        {
            return BadRequest(new
            {
                message = "Thư mục lưu ảnh không hợp lệ. Chỉ chấp nhận: payments, newsfeed, general."
            });
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Vui lòng chọn tệp ảnh để tải lên." });
        }

        if (file.Length > MaxFileSizeBytes)
        {
            return BadRequest(new { message = "Dung lượng ảnh vượt quá giới hạn cho phép (tối đa 5MB)." });
        }

        var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant();
        var contentType = file.ContentType?.Trim().ToLowerInvariant();

        if (string.IsNullOrEmpty(ext)
            || !AllowedExtensions.Contains(ext)
            || string.IsNullOrEmpty(contentType)
            || !AllowedContentTypes.Contains(contentType))
        {
            return BadRequest(new
            {
                message = "Định dạng tệp không hợp lệ. Chỉ chấp nhận ảnh JPG, JPEG, PNG hoặc WEBP."
            });
        }

        var webRoot = !string.IsNullOrWhiteSpace(env.WebRootPath)
            ? env.WebRootPath
            : Path.Combine(env.ContentRootPath, "wwwroot");

        var uploadDir = Path.Combine(webRoot, "uploads", safeFolder);
        Directory.CreateDirectory(uploadDir);

        var safeFileName = $"{Guid.NewGuid():N}{ext}";
        var filePath = Path.Combine(uploadDir, safeFileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var absoluteUrl = $"{Request.Scheme}://{Request.Host}{Request.PathBase}/uploads/{safeFolder}/{safeFileName}";
        return Ok(new { url = absoluteUrl });
    }
}
