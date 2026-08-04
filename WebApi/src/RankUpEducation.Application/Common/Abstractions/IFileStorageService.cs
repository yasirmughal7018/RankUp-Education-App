namespace RankUpEducation.Application.Common.Abstractions;

/// <summary>Stores uploaded binary content and returns a public URL or path.</summary>
public interface IFileStorageService
{
    /// <summary>Saves content to storage and returns the client-accessible path or URL.</summary>
    Task<string> SaveAsync(Stream content, string fileName, string contentType, CancellationToken cancellationToken);
}
