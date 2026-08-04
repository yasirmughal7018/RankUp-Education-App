namespace RankUpEducation.Application.Common.Exceptions;

/// <summary>Requested resource does not exist or is not visible to the caller; mapped to HTTP 404.</summary>
public sealed class NotFoundAppException : AppException
{
    public NotFoundAppException(string message)
        : base(message)
    {
    }
}
