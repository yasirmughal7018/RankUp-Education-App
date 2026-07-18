namespace RankUpEducation.Domain.Auth;

/// <summary>
/// Approval queue for school/campus change requests. Table: app_user_school_change_approval.
/// </summary>
public sealed class UserSchoolChangeApproval
{
    private UserSchoolChangeApproval()
    {
    }

    private UserSchoolChangeApproval(
        long requestId,
        long approvedByUserId,
        UserRole approvedByRole,
        DateTimeOffset? approvedAt,
        bool? isApproved)
    {
        RequestId = requestId;
        ApprovedByUserId = approvedByUserId;
        ApprovedByRole = approvedByRole;
        ApprovedAt = approvedAt;
        IsApproved = isApproved;
    }

    public long Id { get; private set; }
    public long RequestId { get; private set; }
    public long ApprovedByUserId { get; private set; }
    public UserRole ApprovedByRole { get; private set; }
    public DateTimeOffset? ApprovedAt { get; private set; }
    public bool? IsApproved { get; private set; }

    public bool IsPending => IsApproved is null && ApprovedAt is null;

    public static UserSchoolChangeApproval CreatePending(
        long requestId,
        long approverUserId,
        UserRole approverRole)
        => new(requestId, approverUserId, approverRole, approvedAt: null, isApproved: null);

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

    public void RecordRejected(DateTimeOffset rejectedAt)
    {
        IsApproved = false;
        ApprovedAt = rejectedAt;
    }
}
