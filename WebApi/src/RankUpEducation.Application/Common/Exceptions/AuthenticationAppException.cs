namespace RankUpEducation.Application.Common.Exceptions;

/// <summary>Authentication failed or is missing; mapped to HTTP 401.</summary>
public sealed class AuthenticationAppException : AppException
{
    public AuthenticationAppException(string message = "Invalid username or password.")
        : base(message)
    {
    }
}
