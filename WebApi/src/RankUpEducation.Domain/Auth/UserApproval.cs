namespace RankUpEducation.Domain.Auth;

/// <summary>
/// Registration approval queue + trail. Table: app_user_approval.
/// Pending: IsApproved is null and ApprovedAt is null.
/// Approved: IsApproved = true (ApprovedAt set).
/// Rejected: IsApproved = false (ApprovedAt set).
/// PortalAdmin approval activates the account; other approvals are recorded only.
/// </summary>
public sealed class UserApproval
{
    private UserApproval()
    {
    }

    private UserApproval(
        long userId,
        long approvedByUserId,
        UserRole approvedByRole,
        DateTimeOffset? approvedAt,
        bool? isApproved)
    {
        UserId = userId;
        ApprovedByUserId = approvedByUserId;
        ApprovedByRole = approvedByRole;
        ApprovedAt = approvedAt;
        IsApproved = isApproved;
    }

    public long Id { get; private set; }
    public long UserId { get; private set; }
    /// <summary>Assigned / acting admin for this approval row.</summary>
    public long ApprovedByUserId { get; private set; }
    public UserRole ApprovedByRole { get; private set; }
    /// <summary>Null while pending; set when this admin approves or rejects.</summary>
    public DateTimeOffset? ApprovedAt { get; private set; }
    /// <summary>Null = pending; true = approved; false = rejected.</summary>
    public bool? IsApproved { get; private set; }

    public bool IsPending => IsApproved is null && ApprovedAt is null;

    public static UserApproval CreatePending(
        long userId,
        long approverUserId,
        UserRole approverRole)
        => new(userId, approverUserId, approverRole, approvedAt: null, isApproved: null);

    public void MarkApproved(DateTimeOffset approvedAt)
    {
        if (!IsPending)
        {
            return;
        }

        IsApproved = true;
        ApprovedAt = approvedAt;
    }

    public void MarkRejected(DateTimeOffset rejectedAt)
    {
        if (!IsPending)
        {
            return;
        }

        IsApproved = false;
        ApprovedAt = rejectedAt;
    }

    /// <summary>
    /// Force-record rejection (e.g. admin who previously approved then rejects while still pending activation).
    /// </summary>
    public void RecordRejected(DateTimeOffset rejectedAt)
    {
        IsApproved = false;
        ApprovedAt = rejectedAt;
    }
}
