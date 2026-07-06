namespace RankUpEducation.Contracts.Auth;

public sealed record LoginResponse(
    string AccessToken,
    string RefreshToken,
    CurrentUserResponse User);
