namespace RankUpEducation.Contracts.Auth;

/// <summary>First password after admin approval (anonymous; no session issued).</summary>
public sealed record SetInitialPasswordRequest(
    string Username,
    string NewPassword);
