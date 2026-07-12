namespace RankUpEducation.Domain.Auth;

/// <summary>
/// Registration approval queue + trail. Table: app_user_approval.
/// Pending: ApprovedAt is null (assigned reviewer has not acted).
/// Approved: ApprovedAt is set (that reviewer approved).
/// Activating the account does not require every pending row to be approved.
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
        DateTimeOffset? approvedAt)
    {
        UserId = userId;
        ApprovedByUserId = approvedByUserId;
        ApprovedByRole = approvedByRole;
        ApprovedAt = approvedAt;
    }

    public long Id { get; private set; }
    public long UserId { get; private set; }
    /// <summary>Assigned / acting admin for this approval row.</summary>
    public long ApprovedByUserId { get; private set; }
    public UserRole ApprovedByRole { get; private set; }
    /// <summary>Null while pending; set when this admin approves.</summary>
    public DateTimeOffset? ApprovedAt { get; private set; }

    public bool IsPending => ApprovedAt is null;

    public static UserApproval CreatePending(
        long userId,
        long approverUserId,
        UserRole approverRole)
        => new(userId, approverUserId, approverRole, approvedAt: null);

    public void MarkApproved(DateTimeOffset approvedAt)
    {
        if (ApprovedAt is not null)
        {
            return;
        }

        ApprovedAt = approvedAt;
    }
}
