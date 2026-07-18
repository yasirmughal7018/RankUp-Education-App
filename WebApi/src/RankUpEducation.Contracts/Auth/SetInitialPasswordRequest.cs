namespace RankUpEducation.Contracts.Auth;

public sealed record SetInitialPasswordRequest(
    string Username,
    string NewPassword);
