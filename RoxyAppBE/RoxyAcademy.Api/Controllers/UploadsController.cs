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

    private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.Ordinal)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    };

    private static readonly HashSet<string> AllowedImageContentTypes = new(StringComparer.Ordinal)
    {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp"
    };

    private static readonly Dictionary<string, string> AllowedDocumentContentTypes = new(StringComparer.Ordinal)
    {
        [".pdf"] = "application/pdf",
        [".doc"] = "application/msword",
        [".docx"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        [".xls"] = "application/vnd.ms-excel",
        [".xlsx"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
        var isGeneralFolder = string.Equals(safeFolder, "general", StringComparison.Ordinal);

        var isValidImage = !string.IsNullOrEmpty(ext)
            && !string.IsNullOrEmpty(contentType)
            && AllowedImageExtensions.Contains(ext)
            && AllowedImageContentTypes.Contains(contentType);

        var isValidDocument = isGeneralFolder
            && !string.IsNullOrEmpty(ext)
            && !string.IsNullOrEmpty(contentType)
            && AllowedDocumentContentTypes.TryGetValue(ext, out var expectedContentType)
            && string.Equals(contentType, expectedContentType, StringComparison.Ordinal);

        if (!isValidImage && !isValidDocument)
        {
            var errorMessage = isGeneralFolder
                ? "Định dạng tệp không hợp lệ. Thư mục general chấp nhận ảnh (JPG, JPEG, PNG, WEBP) hoặc tài liệu (PDF, DOC, DOCX, XLS, XLSX)."
                : "Định dạng tệp không hợp lệ. Chỉ chấp nhận ảnh JPG, JPEG, PNG hoặc WEBP.";

            return BadRequest(new { message = errorMessage });
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
