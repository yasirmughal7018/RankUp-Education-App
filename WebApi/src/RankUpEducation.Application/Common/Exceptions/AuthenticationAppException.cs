namespace RankUpEducation.Application.Common.Exceptions;

public sealed class AuthenticationAppException : AppException
{
    public AuthenticationAppException(string message = "Invalid username or password.")
        : base(message)
    {
    }
}
