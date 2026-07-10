using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Quizzes;

public sealed record QuizManageScope(
    UserRole Role,
    long UserId,
    long ProfileId,
    int? SchoolId,
    int? CampusId)
{
    public long ParentId => ProfileId;
}

public static class QuizScopeResolver
{
    public static QuizManageScope RequireManageScope(ICurrentUserService currentUser)
    {
        var role = ParseRole(currentUser.Role);
        if (role is not (UserRole.Parent or UserRole.Teacher))
        {
            throw new ForbiddenAppException("Only parents and teachers can manage quizzes.");
        }

        var userId = currentUser.UserId
            ?? throw new ForbiddenAppException("User account was not found.");

        var profileId = currentUser.ProfileId ?? userId;

        if (role == UserRole.Teacher)
        {
            var schoolId = currentUser.SchoolId
                ?? throw new ForbiddenAppException("Teacher school context was not found.");
            var campusId = currentUser.CampusId
                ?? throw new ForbiddenAppException("Teacher campus context was not found.");

            return new QuizManageScope(role, userId, profileId, schoolId, campusId);
        }

        return new QuizManageScope(role, userId, profileId, null, null);
    }

    public static QuizManageScope RequireApprovalScope(ICurrentUserService currentUser)
    {
        var role = ParseRole(currentUser.Role);
        if (role is not (UserRole.SchoolAdmin or UserRole.PortalAdmin))
        {
            throw new ForbiddenAppException("Only school administrators can approve quizzes.");
        }

        var userId = currentUser.UserId
            ?? throw new ForbiddenAppException("User account was not found.");

        return new QuizManageScope(role, userId, userId, currentUser.SchoolId, currentUser.CampusId);
    }

    public static void EnsureOwnsQuiz(Quiz quiz, QuizManageScope scope)
    {
        if (!IsQuizOwner(quiz, scope))
        {
            throw new ForbiddenAppException("You do not have access to this quiz.");
        }

        if (scope.Role == UserRole.Teacher)
        {
            if (scope.SchoolId != quiz.SchoolId || scope.CampusId != quiz.SchoolCampusId)
            {
                throw new ForbiddenAppException("You can only manage quizzes in your school campus.");
            }
        }
    }

    public static bool IsQuizOwner(Quiz quiz, QuizManageScope scope)
        => string.Equals(quiz.CreatedByName, scope.UserId.ToString(), StringComparison.Ordinal);

    public static async Task EnsureCanAccessStudentAsync(
        IStudentScopeRepository studentScope,
        QuizManageScope scope,
        long studentId,
        CancellationToken cancellationToken)
    {
        if (scope.Role == UserRole.Parent)
        {
            if (!await studentScope.IsLinkedStudentAsync(scope.ParentId, studentId, cancellationToken))
            {
                throw new ForbiddenAppException("You can only assign quizzes to linked children.");
            }

            return;
        }

        if (scope.Role == UserRole.Teacher)
        {
            if (!await studentScope.IsStudentInSchoolAsync(
                    studentId,
                    scope.SchoolId!.Value,
                    scope.CampusId!.Value,
                    cancellationToken))
            {
                throw new ForbiddenAppException("You can only assign quizzes to students in your school campus.");
            }
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
