namespace RankUpEducation.Application.Common.Exceptions;

/// <summary>Base class for application-layer exceptions mapped to HTTP responses by middleware.</summary>
public abstract class AppException : Exception
{
    protected AppException(string message)
        : base(message)
    {
    }
}
