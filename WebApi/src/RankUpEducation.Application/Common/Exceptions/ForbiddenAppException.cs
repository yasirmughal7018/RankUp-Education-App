namespace RankUpEducation.Application.Common.Exceptions;

public sealed class ForbiddenAppException : AppException
{
    public ForbiddenAppException(string message = "You are not allowed to perform this action.")
        : base(message)
    {
    }
}
