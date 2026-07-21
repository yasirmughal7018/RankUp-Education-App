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

    /// <summary>PortalAdmin, SchoolAdmin, and CampusAdmin may approve / reject in their scope.</summary>
    public bool CanApprove =>
        Role is UserRole.PortalAdmin or UserRole.SchoolAdmin or UserRole.CampusAdmin;

    /// <summary>Only PortalAdmin may activate / deactivate / archive.</summary>
    public bool CanLifecycle => IsPortalAdmin;

    /// <summary>
    /// Visibility stamped when this role approves:
    /// CampusAdmin → Campus, SchoolAdmin → School, PortalAdmin → Public.
    /// </summary>
    public short ApprovalVisibilityLevel => Role switch
    {
        UserRole.PortalAdmin => QuestionVisibilityLevels.Public,
        UserRole.SchoolAdmin => QuestionVisibilityLevels.School,
        UserRole.CampusAdmin => QuestionVisibilityLevels.Campus,
        _ => QuestionVisibilityLevels.None
    };
}

/// <summary>
/// Resolves manage / approve / lifecycle scopes and enforces org visibility for the question bank.
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

    /// <summary>Requires PortalAdmin, SchoolAdmin, or CampusAdmin for approve / reject.</summary>
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

    /// <summary>True when question.CreatedBy matches the caller's user id string.</summary>
    public static bool IsOwner(Question question, QuestionManageScope scope)
        => string.Equals(question.CreatedBy, scope.UserId.ToString(), StringComparison.Ordinal);

    /// <summary>Throws if the caller is not the question creator.</summary>
    public static void EnsureIsOwner(Question question, QuestionManageScope scope)
    {
        if (!IsOwner(question, scope))
        {
            throw new ForbiddenAppException("You can only change questions you created.");
        }
    }

    /// <summary>
    /// Org check for approve/reject: CampusAdmin same campus, SchoolAdmin same school, PortalAdmin any.
    /// </summary>
    public static void EnsureCanApproveOrReject(Question question, QuestionManageScope scope)
    {
        if (scope.IsPortalAdmin)
        {
            return;
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
    /// Whether an Approved question is visible to the viewer based on visibility level + org.
    /// Public → everyone. School → same school (all campuses). Campus → same campus.
    /// SchoolAdmin also sees Campus-approved items in their school.
    /// </summary>
    public static bool CanViewApprovedVisibility(
        short visibilityLevel,
        int? questionSchoolId,
        int? questionCampusId,
        QuestionManageScope scope)
    {
        if (scope.IsPortalAdmin)
        {
            return true;
        }

        if (visibilityLevel == QuestionVisibilityLevels.Public)
        {
            return true;
        }

        if (visibilityLevel == QuestionVisibilityLevels.School)
        {
            return scope.SchoolId.HasValue
                   && questionSchoolId.HasValue
                   && scope.SchoolId == questionSchoolId;
        }

        if (visibilityLevel == QuestionVisibilityLevels.Campus)
        {
            if (scope.CampusId.HasValue
                && questionCampusId.HasValue
                && scope.CampusId == questionCampusId)
            {
                return true;
            }

            // School Admin sees campus-approved questions across the school.
            if (scope.IsSchoolAdmin
                && scope.SchoolId.HasValue
                && questionSchoolId.HasValue
                && scope.SchoolId == questionSchoolId)
            {
                return true;
            }
        }

        return false;
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
