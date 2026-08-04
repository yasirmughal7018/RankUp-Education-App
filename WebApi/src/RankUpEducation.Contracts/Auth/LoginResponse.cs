namespace RankUpEducation.Contracts.Auth;

/// <summary>Successful authentication payload: JWT access token, refresh token, and user profile.</summary>
public sealed record LoginResponse(
    string AccessToken,
    string RefreshToken,
    CurrentUserResponse User);
