namespace RankUpEducation.Infrastructure.Persistence;

public interface IApiSupportSchemaInitializer
{
    Task EnsureCreatedAsync(CancellationToken cancellationToken);
}
