using RankUpEducation.Application.Common.Abstractions;

namespace RankUpEducation.Infrastructure.Common;

public sealed class SystemDateTimeProvider : IDateTimeProvider
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
