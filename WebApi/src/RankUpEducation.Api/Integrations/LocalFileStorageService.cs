using RankUpEducation.Application.Common.Abstractions;

namespace RankUpEducation.Api.Integrations;

public sealed class LocalFileStorageService : IFileStorageService
{
    private readonly IWebHostEnvironment _environment;

    public LocalFileStorageService(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public async Task<string> SaveAsync(
        Stream content,
        string fileName,
        string contentType,
        CancellationToken cancellationToken)
    {
        var extension = Path.GetExtension(fileName);
        if (string.IsNullOrWhiteSpace(extension))
        {
            extension = contentType switch
            {
                "image/png" => ".png",
                "image/webp" => ".webp",
                "image/gif" => ".gif",
                _ => ".jpg",
            };
        }

        var relativeFolder = Path.Combine("uploads", "avatars");
        var absoluteFolder = Path.Combine(_environment.ContentRootPath, "wwwroot", relativeFolder);
        Directory.CreateDirectory(absoluteFolder);

        var storedName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var absolutePath = Path.Combine(absoluteFolder, storedName);

        await using var fileStream = File.Create(absolutePath);
        await content.CopyToAsync(fileStream, cancellationToken);

        return $"/{relativeFolder.Replace('\\', '/')}/{storedName}";
    }
}
