namespace RankUpEducation.Contracts.Auth;

/// <summary>
/// Result of checking a CNIC/mobile before password entry.
/// Status: PendingApproval | NeedsPasswordSetup | Ready | Rejected
/// </summary>
public sealed record LoginStatusResponse(
    string Status,
    string Message);
