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

    /// <summary>Creates a queue row for an admin who must review this school-change request.</summary>
    public static UserSchoolChangeApproval CreatePending(
        long requestId,
        long approverUserId,
        UserRole approverRole)
        => new(requestId, approverUserId, approverRole, approvedAt: null, isApproved: null);

    /// <summary>Records this admin's approval on the request.</summary>
    public void MarkApproved(DateTimeOffset approvedAt)
    {
        if (!IsPending)
        {
            return;
        }

        IsApproved = true;
        ApprovedAt = approvedAt;
    }

    /// <summary>Records this admin's rejection on the request.</summary>
    public void MarkRejected(DateTimeOffset rejectedAt)
    {
        if (!IsPending)
        {
            return;
        }

        IsApproved = false;
        ApprovedAt = rejectedAt;
    }

    /// <summary>Force-records rejection without requiring a pending state.</summary>
    public void RecordRejected(DateTimeOffset rejectedAt)
    {
        IsApproved = false;
        ApprovedAt = rejectedAt;
    }
}
