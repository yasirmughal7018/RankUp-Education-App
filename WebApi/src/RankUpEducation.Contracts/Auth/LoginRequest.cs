namespace RankUpEducation.Contracts.Auth;

public sealed record LoginRequest(
    string Username,
    string Password);
