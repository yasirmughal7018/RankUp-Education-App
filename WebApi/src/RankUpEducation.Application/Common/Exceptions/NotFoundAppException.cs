namespace RankUpEducation.Application.Common.Exceptions;

public sealed class NotFoundAppException : AppException
{
    public NotFoundAppException(string message)
        : base(message)
    {
    }
}
