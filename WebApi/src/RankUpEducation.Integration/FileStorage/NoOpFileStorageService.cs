using RankUpEducation.Application.Common.Abstractions;

namespace RankUpEducation.Integration.FileStorage;

public sealed class NoOpFileStorageService : IFileStorageService
{
    public Task<string> SaveAsync(Stream content, string fileName, string contentType, CancellationToken cancellationToken)
    {
        throw new NotSupportedException("File storage provider is not configured.");
    }
}
