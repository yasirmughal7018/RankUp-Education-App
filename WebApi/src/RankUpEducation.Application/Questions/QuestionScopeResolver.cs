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
    public bool CanApprove => Role is UserRole.SchoolAdmin or UserRole.SuperAdmin;
}

public static class QuestionScopeResolver
{
    public static QuestionManageScope RequireManageScope(ICurrentUserService currentUser)
    {
        var role = ParseRole(currentUser.Role);
        if (role is not (UserRole.Parent or UserRole.Teacher or UserRole.SchoolAdmin or UserRole.SuperAdmin))
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
        if (role is not (UserRole.SchoolAdmin or UserRole.SuperAdmin))
        {
            throw new ForbiddenAppException("Only school administrators can approve questions.");
        }

        var userId = currentUser.UserId
            ?? throw new ForbiddenAppException("User account was not found.");

        return new QuestionManageScope(role, userId, currentUser.SchoolId, currentUser.CampusId);
    }

    public static QuestionManageScope RequireAiApprovalScope(ICurrentUserService currentUser)
    {
        var role = ParseRole(currentUser.Role);
        if (role is not UserRole.SuperAdmin)
        {
            throw new ForbiddenAppException("Only super administrators can AI-approve questions.");
        }

        var userId = currentUser.UserId
            ?? throw new ForbiddenAppException("User account was not found.");

        return new QuestionManageScope(role, userId, currentUser.SchoolId, currentUser.CampusId);
    }

    public static void EnsureCanModify(Question question, QuestionManageScope scope)
    {
        if (scope.CanApprove)
        {
            return;
        }

        if (!string.Equals(question.CreatedBy, scope.UserId.ToString(), StringComparison.Ordinal))
        {
            throw new ForbiddenAppException("You can only modify questions you created.");
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
