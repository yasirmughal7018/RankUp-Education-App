using RankUpEducation.Application.Common.Abstractions;

namespace RankUpEducation.Api.Integrations;

/// <summary>Stores uploaded files under wwwroot and returns a site-relative URL.</summary>
public sealed class LocalFileStorageService : IFileStorageService
{
    private readonly IWebHostEnvironment _environment;

    public LocalFileStorageService(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    /// <inheritdoc/>
    public async Task<string> SaveAsync(
        Stream content,
        string fileName,
        string contentType,
        CancellationToken cancellationToken,
        string storageFolder = "uploads/avatars")
    {
        // Infer extension from content type when the client omits a file extension.
        var extension = Path.GetExtension(fileName);
        if (string.IsNullOrWhiteSpace(extension))
        {
            extension = contentType switch
            {
                "image/png" => ".png",
                "image/webp" => ".webp",
                "image/gif" => ".gif",
                "application/pdf" => ".pdf",
                _ => ".jpg",
            };
        }

        var relativeFolder = storageFolder.Replace('\\', '/').Trim('/');
        var absoluteFolder = Path.Combine(_environment.ContentRootPath, "wwwroot", relativeFolder.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(absoluteFolder);

        var storedName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var absolutePath = Path.Combine(absoluteFolder, storedName);

        await using var fileStream = File.Create(absolutePath);
        await content.CopyToAsync(fileStream, cancellationToken);

        return $"/{relativeFolder}/{storedName}";
    }
}
