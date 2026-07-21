using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Quizzes;

/// <summary>Resolved caller context for quiz manage, assign, and review operations.</summary>
public sealed record QuizManageScope(
    UserRole Role,
    long UserId,
    long ProfileId,
    int? SchoolId,
    int? CampusId)
{
    /// <summary>Parent profile id used for linked-student scope checks.</summary>
    public long ParentId => ProfileId;
}

/// <summary>
/// Resolves role-scoped manage/approval context and enforces quiz ownership plus school/campus boundaries.
/// Teachers are limited to their campus; parents operate without school ids but via linked children.
/// </summary>
public static class QuizScopeResolver
{
    /// <summary>Requires Parent or Teacher role; stamps school/campus for teachers.</summary>
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

    /// <summary>Requires SchoolAdmin or PortalAdmin for quiz approval/rejection endpoints.</summary>
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

    /// <summary>Verifies creator ownership and, for teachers, matching school/campus on the quiz row.</summary>
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

    /// <summary>True when <see cref="Quiz.CreatedByName"/> matches the caller's user id.</summary>
    public static bool IsQuizOwner(Quiz quiz, QuizManageScope scope)
        => string.Equals(quiz.CreatedByName, scope.UserId.ToString(), StringComparison.Ordinal);

    /// <summary>
    /// Parents may only target linked children; teachers may only target students in their campus.
    /// </summary>
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
