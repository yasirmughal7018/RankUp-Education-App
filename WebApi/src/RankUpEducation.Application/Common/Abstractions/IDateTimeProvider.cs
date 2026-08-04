namespace RankUpEducation.Application.Common.Abstractions;

/// <summary>Abstraction over system clock for testable audit timestamps.</summary>
public interface IDateTimeProvider
{
    /// <summary>Current UTC time used for auditing and token expiry.</summary>
    DateTimeOffset UtcNow { get; }
}
