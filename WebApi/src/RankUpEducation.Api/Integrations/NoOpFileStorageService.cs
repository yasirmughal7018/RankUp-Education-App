using RankUpEducation.Application.Common.Abstractions;

namespace RankUpEducation.Api.Integrations;

/// <summary>Placeholder file storage that fails fast when no provider is configured.</summary>
public sealed class NoOpFileStorageService : IFileStorageService
{
    public Task<string> SaveAsync(Stream content, string fileName, string contentType, CancellationToken cancellationToken)
    {
        throw new NotSupportedException("File storage provider is not configured.");
    }
}
