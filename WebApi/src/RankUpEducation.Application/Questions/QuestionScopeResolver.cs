using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Questions;

namespace RankUpEducation.Application.Questions;

/// <summary>
/// Authenticated caller's role and org for question-bank manage / approve / lifecycle checks.
/// </summary>
public sealed record QuestionManageScope(
    UserRole Role,
    long UserId,
    int? SchoolId,
    int? CampusId)
{
    public bool IsPortalAdmin => Role == UserRole.PortalAdmin;
    public bool IsSchoolAdmin => Role == UserRole.SchoolAdmin;
    public bool IsCampusAdmin => Role == UserRole.CampusAdmin;

    /// <summary>PortalAdmin, SchoolAdmin, and CampusAdmin may endorse / reject in their hierarchy.</summary>
    public bool CanApprove =>
        Role is UserRole.PortalAdmin or UserRole.SchoolAdmin or UserRole.CampusAdmin;

    /// <summary>Only PortalAdmin may activate / deactivate / archive / publish.</summary>
    public bool CanLifecycle => IsPortalAdmin;

    /// <summary>
    /// Visibility stamped when this role endorses/publishes:
    /// CampusAdmin → Campus, SchoolAdmin → School, PortalAdmin → Public.
    /// </summary>
    public short ApprovalVisibilityLevel => Role switch
    {
        UserRole.PortalAdmin => QuestionVisibilityLevels.Public,
        UserRole.SchoolAdmin => QuestionVisibilityLevels.School,
        UserRole.CampusAdmin => QuestionVisibilityLevels.Campus,
        _ => QuestionVisibilityLevels.None
    };

    /// <summary>True when this role's approval publishes (Public + Active).</summary>
    public bool ApprovalPublishes => IsPortalAdmin;
}

/// <summary>
/// Resolves manage / approve / lifecycle scopes and enforces creator-tier hierarchy
/// plus restricted visibility for non-public questions.
/// </summary>
public static class QuestionScopeResolver
{
    /// <summary>Requires a role that can create/list/manage questions (Parent through PortalAdmin).</summary>
    public static QuestionManageScope RequireManageScope(ICurrentUserService currentUser)
    {
        var role = ParseRole(currentUser.Role);
        if (role is not (
            UserRole.Parent
            or UserRole.Teacher
            or UserRole.CampusAdmin
            or UserRole.SchoolAdmin
            or UserRole.PortalAdmin))
        {
            throw new ForbiddenAppException("You do not have permission to manage questions.");
        }

        var userId = currentUser.UserId
            ?? throw new ForbiddenAppException("User account was not found.");

        return new QuestionManageScope(role, userId, currentUser.SchoolId, currentUser.CampusId);
    }

    /// <summary>Requires PortalAdmin, SchoolAdmin, or CampusAdmin for endorse / reject / publish.</summary>
    public static QuestionManageScope RequireApprovalScope(ICurrentUserService currentUser)
    {
        var scope = RequireManageScope(currentUser);
        if (!scope.CanApprove)
        {
            throw new ForbiddenAppException(
                "Only Portal Admin, School Admin, or Campus Admin can approve or reject questions.");
        }

        return scope;
    }

    /// <summary>Requires PortalAdmin for activate / deactivate / archive.</summary>
    public static QuestionManageScope RequireLifecycleScope(ICurrentUserService currentUser)
    {
        var role = ParseRole(currentUser.Role);
        if (role is not UserRole.PortalAdmin)
        {
            throw new ForbiddenAppException(
                "Only Portal Admin can activate, deactivate, or archive questions.");
        }

        var userId = currentUser.UserId
            ?? throw new ForbiddenAppException("User account was not found.");

        return new QuestionManageScope(role, userId, currentUser.SchoolId, currentUser.CampusId);
    }

    /// <summary>True when question.CreatedBy matches the caller's user id.</summary>
    public static bool IsOwner(Question question, QuestionManageScope scope)
        => question.CreatedBy == scope.UserId;

    /// <summary>Throws if the caller is not the question creator.</summary>
    public static void EnsureIsOwner(Question question, QuestionManageScope scope)
    {
        if (!IsOwner(question, scope))
        {
            throw new ForbiddenAppException("You can only change questions you created.");
        }
    }

    /// <summary>
    /// Approval hierarchy + org check.
    /// Approver must be a strictly higher tier than the creator (no self / same-tier).
    /// Teacher/Parent → CampusAdmin / SchoolAdmin / PortalAdmin;
    /// CampusAdmin → SchoolAdmin / PortalAdmin;
    /// SchoolAdmin → PortalAdmin only.
    /// Org: CampusAdmin same campus, SchoolAdmin same school, PortalAdmin any.
    /// </summary>
    public static void EnsureCanApproveOrReject(Question question, QuestionManageScope scope)
    {
        if (scope.IsPortalAdmin)
        {
            return;
        }

        if (!scope.CanApprove)
        {
            throw new ForbiddenAppException(
                "Only Portal Admin, School Admin, or Campus Admin can approve or reject questions.");
        }

        // No self-approval except PortalAdmin (who may publish anything, including own pending).
        if (!scope.IsPortalAdmin && IsOwner(question, scope))
        {
            throw new ForbiddenAppException("You cannot approve or reject your own question.");
        }

        if (!CanApproveCreatorTier(scope.Role, question.CreatedByRole))
        {
            throw new ForbiddenAppException(DescribeHierarchyDenial(scope.Role, question.CreatedByRole));
        }

        if (scope.IsSchoolAdmin)
        {
            if (!scope.SchoolId.HasValue)
            {
                throw new ForbiddenAppException("School Admin must belong to a school to approve questions.");
            }

            if (question.SchoolId != scope.SchoolId)
            {
                throw new ForbiddenAppException(
                    "School Admin can only approve or reject questions within their school.");
            }

            return;
        }

        if (scope.IsCampusAdmin)
        {
            if (!scope.CampusId.HasValue)
            {
                throw new ForbiddenAppException("Campus Admin must belong to a campus to approve questions.");
            }

            if (question.CampusId != scope.CampusId)
            {
                throw new ForbiddenAppException(
                    "Campus Admin can only approve or reject questions within their campus.");
            }

            return;
        }

        throw new ForbiddenAppException(
            "Only Portal Admin, School Admin, or Campus Admin can approve or reject questions.");
    }

    /// <summary>
    /// Restricted audience for non-Public questions:
    /// creator always; PortalAdmin always;
    /// Teacher/Parent creators → their CampusAdmin (same campus) + SchoolAdmin (same school);
    /// CampusAdmin creators → SchoolAdmin (same school) only;
    /// SchoolAdmin creators → PortalAdmin only.
    /// Public questions are visible to every question-managing role.
    /// </summary>
    public static bool CanViewQuestion(
        long createdByUserId,
        UserRole createdByRole,
        short visibilityLevel,
        int? questionSchoolId,
        int? questionCampusId,
        QuestionManageScope scope)
    {
        if (scope.IsPortalAdmin)
        {
            return true;
        }

        if (createdByUserId == scope.UserId)
        {
            return true;
        }

        if (QuestionVisibilityLevels.IsPublished(visibilityLevel))
        {
            return true;
        }

        // Non-public: upward admins only, based on creator tier.
        if (scope.IsSchoolAdmin
            && scope.SchoolId.HasValue
            && questionSchoolId == scope.SchoolId
            && IsCreatorVisibleToSchoolAdmin(createdByRole))
        {
            return true;
        }

        if (scope.IsCampusAdmin
            && scope.CampusId.HasValue
            && questionCampusId == scope.CampusId
            && IsCreatorVisibleToCampusAdmin(createdByRole))
        {
            return true;
        }

        return false;
    }

    /// <summary>True when approver tier is strictly above creator tier (PortalAdmin always).</summary>
    public static bool CanApproveCreatorTier(UserRole approverRole, UserRole creatorRole)
        => approverRole == UserRole.PortalAdmin
           || ApprovalTier(approverRole) > ApprovalTier(creatorRole);

    /// <summary>Creators CampusAdmin may still see in pending/restricted queues (Teacher/Parent only).</summary>
    public static bool IsCreatorVisibleToCampusAdmin(UserRole createdByRole)
        => createdByRole is UserRole.Teacher or UserRole.Parent;

    /// <summary>Creators SchoolAdmin may still see in pending/restricted queues.</summary>
    public static bool IsCreatorVisibleToSchoolAdmin(UserRole createdByRole)
        => createdByRole is UserRole.Teacher or UserRole.Parent or UserRole.CampusAdmin;

    /// <summary>0 Teacher/Parent, 1 CampusAdmin, 2 SchoolAdmin, 3 PortalAdmin.</summary>
    public static int ApprovalTier(UserRole role) => role switch
    {
        UserRole.PortalAdmin => 3,
        UserRole.SchoolAdmin => 2,
        UserRole.CampusAdmin => 1,
        _ => 0
    };

    private static string DescribeHierarchyDenial(UserRole approverRole, UserRole creatorRole)
    {
        if (approverRole == UserRole.CampusAdmin
            && creatorRole is UserRole.CampusAdmin or UserRole.SchoolAdmin or UserRole.PortalAdmin)
        {
            return "Campus Admin can only approve questions created by Teachers or Parents in their campus.";
        }

        if (approverRole == UserRole.SchoolAdmin
            && creatorRole is UserRole.SchoolAdmin or UserRole.PortalAdmin)
        {
            return "School Admin can only approve questions created by Teachers, Parents, or Campus Admins in their school.";
        }

        return "You do not have permission to approve or reject this question.";
    }

    private static UserRole ParseRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role))
        {
            throw new AuthenticationAppException("Authentication is required.");
        }

        return Enum.Parse<UserRole>(role, ignoreCase: true);
    }
}
