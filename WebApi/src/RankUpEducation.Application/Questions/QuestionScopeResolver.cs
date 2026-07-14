using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Questions;

namespace RankUpEducation.Application.Questions;

public sealed record QuestionManageScope(
    UserRole Role,
    long UserId,
    int? SchoolId,
    int? CampusId)
{
    public bool IsPortalAdmin => Role == UserRole.PortalAdmin;

    /// <summary>Only PortalAdmin may approve / reject.</summary>
    public bool CanApprove => IsPortalAdmin;

    /// <summary>Only PortalAdmin may activate / deactivate / archive.</summary>
    public bool CanLifecycle => IsPortalAdmin;
}

public static class QuestionScopeResolver
{
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

    public static QuestionManageScope RequireApprovalScope(ICurrentUserService currentUser)
    {
        var role = ParseRole(currentUser.Role);
        if (role is not UserRole.PortalAdmin)
        {
            throw new ForbiddenAppException("Only Portal Admin can approve or reject questions.");
        }

        var userId = currentUser.UserId
            ?? throw new ForbiddenAppException("User account was not found.");

        return new QuestionManageScope(role, userId, currentUser.SchoolId, currentUser.CampusId);
    }

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

    public static bool IsOwner(Question question, QuestionManageScope scope)
        => string.Equals(question.CreatedBy, scope.UserId.ToString(), StringComparison.Ordinal);

    public static void EnsureIsOwner(Question question, QuestionManageScope scope)
    {
        if (!IsOwner(question, scope))
        {
            throw new ForbiddenAppException("You can only change questions you created.");
        }
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
