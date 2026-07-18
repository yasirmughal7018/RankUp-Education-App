namespace RankUpEducation.Contracts.Auth;

/// <summary>
/// Result of checking a CNIC/mobile before password entry.
/// Status: PendingApproval | NeedsPasswordSetup | Ready | Rejected | LockedPendingSchoolChange
/// </summary>
public sealed record LoginStatusResponse(
    string Status,
    string Message);
