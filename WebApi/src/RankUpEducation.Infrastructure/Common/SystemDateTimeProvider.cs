using RankUpEducation.Application.Common.Abstractions;

namespace RankUpEducation.Infrastructure.Common;

/// <summary>Production implementation of <see cref="IDateTimeProvider"/> using the system clock.</summary>
public sealed class SystemDateTimeProvider : IDateTimeProvider
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
