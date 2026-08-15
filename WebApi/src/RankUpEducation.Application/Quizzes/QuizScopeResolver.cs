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
    /// <summary>
    /// Requires Parent, Teacher, SchoolAdmin, or PortalAdmin for quiz manage/monitor/review.
    /// Teachers are campus-scoped; school admins are school-scoped; portal admins are platform-scoped.
    /// </summary>
    public static QuizManageScope RequireManageScope(ICurrentUserService currentUser)
    {
        var role = ParseRole(currentUser.Role);
        if (role is not (UserRole.Parent or UserRole.Tutor or UserRole.Teacher or UserRole.Coordinator or UserRole.SchoolAdmin or UserRole.PortalAdmin))
        {
            throw new ForbiddenAppException("Your role cannot manage quizzes.");
        }

        var userId = currentUser.UserId
            ?? throw new ForbiddenAppException("User account was not found.");

        var profileId = currentUser.ProfileId ?? userId;

        if (role is UserRole.Teacher or UserRole.Coordinator)
        {
            var schoolId = currentUser.SchoolId
                ?? throw new ForbiddenAppException($"{role} school context was not found.");
            var campusId = currentUser.CampusId
                ?? throw new ForbiddenAppException($"{role} campus context was not found.");

            return new QuizManageScope(role, userId, profileId, schoolId, campusId);
        }

        if (role == UserRole.SchoolAdmin)
        {
            var schoolId = currentUser.SchoolId
                ?? throw new ForbiddenAppException("School admin school context was not found.");
            return new QuizManageScope(role, userId, profileId, schoolId, currentUser.CampusId);
        }

        if (role == UserRole.PortalAdmin)
        {
            return new QuizManageScope(role, userId, profileId, currentUser.SchoolId, currentUser.CampusId);
        }

        return new QuizManageScope(role, userId, profileId, null, null);
    }

    /// <summary>Requires SchoolAdmin, CampusAdmin, or PortalAdmin for quiz approval/rejection.</summary>
    public static QuizManageScope RequireApprovalScope(ICurrentUserService currentUser)
    {
        var role = ParseRole(currentUser.Role);
        if (role is not (UserRole.SchoolAdmin or UserRole.CampusAdmin or UserRole.PortalAdmin))
        {
            throw new ForbiddenAppException("Only school, campus, or portal administrators can approve quizzes.");
        }

        var userId = currentUser.UserId
            ?? throw new ForbiddenAppException("User account was not found.");

        if (role == UserRole.SchoolAdmin)
        {
            var schoolId = currentUser.SchoolId
                ?? throw new ForbiddenAppException("School admin school context was not found.");
            return new QuizManageScope(role, userId, userId, schoolId, currentUser.CampusId);
        }

        if (role == UserRole.CampusAdmin)
        {
            var schoolId = currentUser.SchoolId
                ?? throw new ForbiddenAppException("Campus admin school context was not found.");
            var campusId = currentUser.CampusId
                ?? throw new ForbiddenAppException("Campus admin campus context was not found.");
            return new QuizManageScope(role, userId, userId, schoolId, campusId);
        }

        return new QuizManageScope(role, userId, userId, currentUser.SchoolId, currentUser.CampusId);
    }

    /// <summary>Requires Parent, Teacher, Coordinator, SchoolAdmin, or PortalAdmin for assignment operations.</summary>
    public static QuizManageScope RequireAssignScope(ICurrentUserService currentUser)
    {
        var role = ParseRole(currentUser.Role);
        if (role is not (UserRole.Parent or UserRole.Tutor or UserRole.Teacher or UserRole.Coordinator or UserRole.SchoolAdmin or UserRole.PortalAdmin))
        {
            throw new ForbiddenAppException("Your role cannot assign quizzes.");
        }

        var userId = currentUser.UserId
            ?? throw new ForbiddenAppException("User account was not found.");

        var profileId = currentUser.ProfileId ?? userId;

        if (role is UserRole.Teacher or UserRole.Coordinator)
        {
            var schoolId = currentUser.SchoolId
                ?? throw new ForbiddenAppException($"{role} school context was not found.");
            var campusId = currentUser.CampusId
                ?? throw new ForbiddenAppException($"{role} campus context was not found.");

            return new QuizManageScope(role, userId, profileId, schoolId, campusId);
        }

        if (role == UserRole.SchoolAdmin)
        {
            var schoolId = currentUser.SchoolId
                ?? throw new ForbiddenAppException("School admin school context was not found.");
            return new QuizManageScope(role, userId, profileId, schoolId, currentUser.CampusId);
        }

        return new QuizManageScope(role, userId, profileId, currentUser.SchoolId, currentUser.CampusId);
    }

    /// <summary>Verifies creator ownership and, for teachers, matching school/campus on the quiz row.</summary>
    public static void EnsureOwnsQuiz(Quiz quiz, QuizManageScope scope)
    {
        if (scope.Role == UserRole.PortalAdmin)
        {
            return;
        }

        if (scope.Role == UserRole.SchoolAdmin)
        {
            if (scope.SchoolId != quiz.SchoolId)
            {
                throw new ForbiddenAppException("You can only manage quizzes in your school.");
            }

            return;
        }

        if (scope.Role == UserRole.CampusAdmin)
        {
            if (scope.SchoolId != quiz.SchoolId || scope.CampusId != quiz.SchoolCampusId)
            {
                throw new ForbiddenAppException("You can only manage quizzes in your campus.");
            }

            return;
        }

        if (!IsQuizOwner(quiz, scope))
        {
            throw new ForbiddenAppException("You do not have access to this quiz.");
        }

        if (scope.Role is UserRole.Teacher or UserRole.Coordinator)
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
    /// List filters for assignment board / pending reviews / reports-style boards.
    /// Teacher/Parent: own quizzes; SchoolAdmin: school; PortalAdmin: platform.
    /// </summary>
    public static (long? CreatorUserId, int? SchoolId) ResolveOwnerListFilter(QuizManageScope scope)
    {
        return scope.Role switch
        {
            UserRole.SchoolAdmin => (null, scope.SchoolId),
            UserRole.PortalAdmin => (null, null),
            _ => (scope.UserId, null),
        };
    }

    /// <summary>
    /// Parents may only target linked children; teachers may only target students in their campus.
    /// </summary>
    public static async Task EnsureCanAccessStudentAsync(
        IStudentScopeRepository studentScope,
        QuizManageScope scope,
        long studentId,
        CancellationToken cancellationToken)
    {
        if (scope.Role is UserRole.Parent or UserRole.Tutor)
        {
            var linked = scope.Role == UserRole.Tutor
                ? await studentScope.IsTutorLinkedStudentAsync(scope.ProfileId, studentId, cancellationToken)
                : await studentScope.IsLinkedStudentAsync(scope.ParentId, studentId, cancellationToken);
            if (!linked)
            {
                throw new ForbiddenAppException(
                    scope.Role == UserRole.Tutor
                        ? "You can only assign quizzes to linked students."
                        : "You can only assign quizzes to linked children.");
            }

            return;
        }

        if (scope.Role is UserRole.Teacher or UserRole.Coordinator)
        {
            if (!await studentScope.IsStudentInTeacherRosterAsync(
                    scope.ProfileId,
                    studentId,
                    scope.SchoolId!.Value,
                    scope.CampusId!.Value,
                    cancellationToken))
            {
                throw new ForbiddenAppException(
                    "You can only assign quizzes to students in your assigned classes and sections.");
            }

            return;
        }

        if (scope.Role == UserRole.SchoolAdmin)
        {
            var context = await studentScope.GetStudentSchoolContextAsync(studentId, cancellationToken)
                ?? throw new ForbiddenAppException("Student school context was not found.");
            if (scope.SchoolId != context.SchoolId)
            {
                throw new ForbiddenAppException("You can only assign quizzes to students in your school.");
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
