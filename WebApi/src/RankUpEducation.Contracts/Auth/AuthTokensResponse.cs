namespace RankUpEducation.Contracts.Auth;

public sealed record AuthTokensResponse(
    string AccessToken,
    string RefreshToken);
