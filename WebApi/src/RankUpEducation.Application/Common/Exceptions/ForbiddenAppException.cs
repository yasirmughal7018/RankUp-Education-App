namespace RankUpEducation.Application.Common.Exceptions;

/// <summary>Authenticated caller lacks permission for the requested action; mapped to HTTP 403.</summary>
public sealed class ForbiddenAppException : AppException
{
    public ForbiddenAppException(string message = "You are not allowed to perform this action.")
        : base(message)
    {
    }
}
