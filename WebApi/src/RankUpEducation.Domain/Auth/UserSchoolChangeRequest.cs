using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Auth;

public sealed class UserSchoolChangeRequest
{
    private UserSchoolChangeRequest()
    {
    }

    private UserSchoolChangeRequest(
        long userId,
        int? fromSchoolId,
        int? fromCampusId,
        int? toSchoolId,
        int? toCampusId,
        UserRole requesterRole,
        DateTimeOffset requestedAt)
    {
        UserId = userId;
        FromSchoolId = fromSchoolId;
        FromCampusId = fromCampusId;
        ToSchoolId = toSchoolId;
        ToCampusId = toCampusId;
        RequesterRole = requesterRole;
        Status = SchoolChangeRequestStatus.Pending;
        RequestedAt = requestedAt;
    }

    public long Id { get; private set; }
    public long UserId { get; private set; }
    public int? FromSchoolId { get; private set; }
    public int? FromCampusId { get; private set; }
    public int? ToSchoolId { get; private set; }
    public int? ToCampusId { get; private set; }
    public UserRole RequesterRole { get; private set; }
    public SchoolChangeRequestStatus Status { get; private set; }
    public DateTimeOffset RequestedAt { get; private set; }
    public DateTimeOffset? ResolvedAt { get; private set; }

    public bool IsPending => Status == SchoolChangeRequestStatus.Pending;

    public static UserSchoolChangeRequest Create(
        long userId,
        int? fromSchoolId,
        int? fromCampusId,
        int? toSchoolId,
        int? toCampusId,
        UserRole requesterRole,
        DateTimeOffset requestedAt)
    {
        if (fromSchoolId == toSchoolId && fromCampusId == toCampusId)
        {
            throw new BusinessRuleException("School and campus are unchanged.");
        }

        return new UserSchoolChangeRequest(
            userId,
            fromSchoolId,
            fromCampusId,
            toSchoolId,
            toCampusId,
            requesterRole,
            requestedAt);
    }

    public void Approve(DateTimeOffset resolvedAt)
    {
        if (!IsPending)
        {
            throw new BusinessRuleException("This school change request is no longer pending.");
        }

        Status = SchoolChangeRequestStatus.Approved;
        ResolvedAt = resolvedAt;
    }

    public void Reject(DateTimeOffset resolvedAt)
    {
        if (!IsPending)
        {
            throw new BusinessRuleException("This school change request is no longer pending.");
        }

        Status = SchoolChangeRequestStatus.Rejected;
        ResolvedAt = resolvedAt;
    }

    public void Cancel(DateTimeOffset resolvedAt)
    {
        if (!IsPending)
        {
            return;
        }

        Status = SchoolChangeRequestStatus.Rejected;
        ResolvedAt = resolvedAt;
    }
}
