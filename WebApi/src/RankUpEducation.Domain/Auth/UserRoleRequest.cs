using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Auth;

/// <summary>
/// Self-service request to add a second role (e.g. Parent → Teacher).
/// Does not lock the account while pending.
/// Table: app_user_role_request.
/// </summary>
public sealed class UserRoleRequest
{
    public const int MaxReasonLength = 1000;
    public const int MaxTeacherCodeLength = 50;
    public const int MaxRejectionReasonLength = 1000;

    private UserRoleRequest()
    {
    }

    private UserRoleRequest(
        long userId,
        UserRole requestedRole,
        int? schoolId,
        int? campusId,
        string? teacherCode,
        string? reasonMessage,
        DateTimeOffset requestedAt)
    {
        UserId = userId;
        RequestedRole = requestedRole;
        SchoolId = schoolId;
        CampusId = campusId;
        TeacherCode = teacherCode;
        ReasonMessage = reasonMessage;
        Status = RoleRequestStatus.Pending;
        RequestedAt = requestedAt;
    }

    public long Id { get; private set; }
    public long UserId { get; private set; }
    public UserRole RequestedRole { get; private set; }
    public int? SchoolId { get; private set; }
    public int? CampusId { get; private set; }
    public string? TeacherCode { get; private set; }
    public string? ReasonMessage { get; private set; }
    public RoleRequestStatus Status { get; private set; }
    public DateTimeOffset RequestedAt { get; private set; }
    public DateTimeOffset? ResolvedAt { get; private set; }
    public string? RejectionReason { get; private set; }
    public long? ResolvedByUserId { get; private set; }

    public bool IsPending => Status == RoleRequestStatus.Pending;

    public static UserRoleRequest Create(
        long userId,
        UserRole requestedRole,
        int? schoolId,
        int? campusId,
        string? teacherCode,
        string? reasonMessage,
        DateTimeOffset requestedAt)
    {
        if (requestedRole is not (UserRole.Teacher or UserRole.Parent or UserRole.Coordinator))
        {
            throw new BusinessRuleException(
                "Only Parent, Teacher, or Coordinator can be requested as an additional role.");
        }

        if (requestedRole == UserRole.Teacher)
        {
            if (schoolId is null or <= 0 || campusId is null or <= 0)
            {
                throw new BusinessRuleException("School and campus are required when requesting Teacher.");
            }

            if (string.IsNullOrWhiteSpace(teacherCode))
            {
                throw new BusinessRuleException("Teacher code is required when requesting Teacher.");
            }
        }

        var trimmedCode = string.IsNullOrWhiteSpace(teacherCode)
            ? null
            : teacherCode.Trim();
        if (trimmedCode is { Length: > MaxTeacherCodeLength })
        {
            trimmedCode = trimmedCode[..MaxTeacherCodeLength];
        }

        var trimmedReason = string.IsNullOrWhiteSpace(reasonMessage)
            ? null
            : reasonMessage.Trim();
        if (trimmedReason is { Length: > MaxReasonLength })
        {
            trimmedReason = trimmedReason[..MaxReasonLength];
        }

        return new UserRoleRequest(
            userId,
            requestedRole,
            schoolId,
            campusId,
            trimmedCode,
            trimmedReason,
            requestedAt);
    }

    public void Approve(long resolvedByUserId, DateTimeOffset resolvedAt)
    {
        if (!IsPending)
        {
            throw new BusinessRuleException("This role request is no longer pending.");
        }

        Status = RoleRequestStatus.Approved;
        ResolvedAt = resolvedAt;
        ResolvedByUserId = resolvedByUserId;
        RejectionReason = null;
    }

    public void Reject(long resolvedByUserId, string reason, DateTimeOffset resolvedAt)
    {
        if (!IsPending)
        {
            throw new BusinessRuleException("This role request is no longer pending.");
        }

        var trimmed = reason.Trim();
        if (trimmed.Length < 10)
        {
            throw new BusinessRuleException("Rejection reason is required (at least 10 characters).");
        }

        if (trimmed.Length > MaxRejectionReasonLength)
        {
            trimmed = trimmed[..MaxRejectionReasonLength];
        }

        Status = RoleRequestStatus.Rejected;
        ResolvedAt = resolvedAt;
        ResolvedByUserId = resolvedByUserId;
        RejectionReason = trimmed;
    }

    public void Cancel(DateTimeOffset resolvedAt)
    {
        if (!IsPending)
        {
            return;
        }

        Status = RoleRequestStatus.Rejected;
        ResolvedAt = resolvedAt;
        RejectionReason = "Superseded by a newer role request.";
    }
}
