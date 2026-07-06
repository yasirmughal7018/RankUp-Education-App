namespace RankUpEducation.Application.Common.Abstractions;

public interface IFileStorageService
{
    Task<string> SaveAsync(Stream content, string fileName, string contentType, CancellationToken cancellationToken);
}
