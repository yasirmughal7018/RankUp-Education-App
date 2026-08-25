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
        if (role is not (UserRole.Parent or UserRole.Teacher or UserRole.Coordinator
                or UserRole.CampusAdmin or UserRole.SchoolAdmin or UserRole.PortalAdmin))
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

        if (role == UserRole.CampusAdmin)
        {
            var schoolId = currentUser.SchoolId
                ?? throw new ForbiddenAppException("Campus admin school context was not found.");
            var campusId = currentUser.CampusId
                ?? throw new ForbiddenAppException("Campus admin campus context was not found.");
            return new QuizManageScope(role, userId, profileId, schoolId, campusId);
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

    /// <summary>Requires Parent, Teacher, Coordinator, CampusAdmin, SchoolAdmin, or PortalAdmin for assignment operations.</summary>
    public static QuizManageScope RequireAssignScope(ICurrentUserService currentUser)
    {
        var role = ParseRole(currentUser.Role);
        if (role is not (UserRole.Parent or UserRole.Teacher or UserRole.Coordinator
                or UserRole.CampusAdmin or UserRole.SchoolAdmin or UserRole.PortalAdmin))
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

        if (role == UserRole.CampusAdmin)
        {
            var schoolId = currentUser.SchoolId
                ?? throw new ForbiddenAppException("Campus admin school context was not found.");
            var campusId = currentUser.CampusId
                ?? throw new ForbiddenAppException("Campus admin campus context was not found.");
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

    /// <summary>
    /// Staff catalog of Published/Assigned/Archived school-type quizzes is platform-wide
    /// (any school, any creator). Draft stays scoped.
    /// </summary>
    public static bool CanViewPublishedSchoolCatalog(UserRole role)
        => role is UserRole.PortalAdmin
            or UserRole.SchoolAdmin
            or UserRole.CampusAdmin
            or UserRole.Teacher
            or UserRole.Coordinator
            or UserRole.Parent;

    /// <summary>
    /// View (list/manage GET) for a published school-type quiz is allowed to all catalog staff.
    /// Mutations still use <see cref="EnsureOwnsQuiz"/>.
    /// </summary>
    public static void EnsureCanViewQuiz(
        Quiz quiz,
        QuizManageScope scope,
        bool isDraftLifecycle)
    {
        if (scope.Role == UserRole.PortalAdmin || IsQuizOwner(quiz, scope))
        {
            return;
        }

        if (!isDraftLifecycle && CanViewPublishedSchoolCatalog(scope.Role))
        {
            return;
        }

        EnsureOwnsQuiz(quiz, scope);
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

    /// <summary>Quiz metadata and questions: portal admin or creator only.</summary>
    public static void EnsureCanEditQuizSettings(Quiz quiz, QuizManageScope scope)
    {
        if (scope.Role == UserRole.PortalAdmin || IsQuizOwner(quiz, scope))
        {
            return;
        }

        throw new ForbiddenAppException("Only the quiz owner or a portal admin can edit quiz settings.");
    }

    /// <summary>
    /// List filters for assignment board / pending reviews / reports-style boards.
    /// Teacher/Parent: own quizzes; SchoolAdmin: school; CampusAdmin: campus; PortalAdmin: platform.
    /// Prefer <see cref="ResolveAssignmentViewFilterAsync"/> for student-scoped assignment views.
    /// </summary>
    public static (long? CreatorUserId, int? SchoolId, int? CampusId) ResolveOwnerListFilter(QuizManageScope scope)
    {
        return scope.Role switch
        {
            UserRole.SchoolAdmin => (null, scope.SchoolId, null),
            UserRole.CampusAdmin => (null, scope.SchoolId, scope.CampusId),
            UserRole.PortalAdmin => (null, null, null),
            _ => (scope.UserId, null, null),
        };
    }

    /// <summary>
    /// Student ids the caller may see on assignment/monitor/review boards.
    /// <c>StudentIds</c> is null for PortalAdmin (unrestricted).
    /// <c>AssignedByUserId</c> keeps rows the caller created even if a student later left scope.
    /// </summary>
    public static async Task<(IReadOnlyList<long>? StudentIds, long? AssignedByUserId)> ResolveAssignmentViewFilterAsync(
        IStudentScopeRepository studentScope,
        QuizManageScope scope,
        CancellationToken cancellationToken)
    {
        if (scope.Role == UserRole.PortalAdmin)
        {
            return (null, null);
        }

        IReadOnlyList<long> studentIds = scope.Role switch
        {
            UserRole.Parent => await studentScope.GetLinkedStudentIdsAsync(
                scope.ParentId,
                cancellationToken),
            UserRole.Teacher or UserRole.Coordinator => await studentScope.GetRosterStudentIdsAsync(
                scope.ProfileId,
                scope.SchoolId!.Value,
                scope.CampusId!.Value,
                scope.Role,
                cancellationToken),
            UserRole.CampusAdmin => await studentScope.GetStudentIdsInSchoolAsync(
                scope.SchoolId!.Value,
                cancellationToken,
                scope.CampusId),
            UserRole.SchoolAdmin => await studentScope.GetStudentIdsInSchoolAsync(
                scope.SchoolId!.Value,
                cancellationToken),
            _ => Array.Empty<long>(),
        };

        return (studentIds, scope.UserId);
    }

    /// <summary>
    /// True when the assignment belongs to a visible student or was created by the caller.
    /// <paramref name="visibleStudentIds"/> null means unrestricted (PortalAdmin).
    /// </summary>
    public static bool IsAssignmentVisible(
        long studentId,
        long assignedByUserId,
        IReadOnlyList<long>? visibleStudentIds,
        long? callerUserId)
    {
        if (visibleStudentIds is null)
        {
            return true;
        }

        if (visibleStudentIds.Contains(studentId))
        {
            return true;
        }

        return callerUserId is not null && assignedByUserId == callerUserId.Value;
    }

    /// <summary>
    /// View/retry/review an existing assignment: caller created it, or the student is in role scope.
    /// </summary>
    public static async Task EnsureCanViewAssignedStudentAsync(
        IStudentScopeRepository studentScope,
        QuizManageScope scope,
        long studentId,
        long assignedByUserId,
        CancellationToken cancellationToken)
    {
        if (scope.Role == UserRole.PortalAdmin || assignedByUserId == scope.UserId)
        {
            return;
        }

        await EnsureCanAccessStudentAsync(studentScope, scope, studentId, cancellationToken);
    }

    /// <summary>No self-approval except PortalAdmin (platform final authority).</summary>
    public static void EnsureCanApproveOrRejectQuiz(Quiz quiz, QuizManageScope scope)
    {
        if (scope.Role == UserRole.PortalAdmin)
        {
            return;
        }

        if (IsQuizOwner(quiz, scope))
        {
            throw new ForbiddenAppException("You cannot approve or reject your own quiz.");
        }
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
        if (scope.Role == UserRole.Parent)
        {
            var linked = await studentScope.IsLinkedStudentAsync(scope.ParentId, studentId, cancellationToken);
            if (!linked)
            {
                throw new ForbiddenAppException("You can only assign quizzes to linked children.");
            }

            return;
        }

        if (scope.Role is UserRole.Teacher or UserRole.Coordinator)
        {
            if (!await studentScope.IsStudentInRosterAsync(
                    scope.ProfileId,
                    studentId,
                    scope.SchoolId!.Value,
                    scope.CampusId!.Value,
                    scope.Role,
                    cancellationToken))
            {
                throw new ForbiddenAppException(
                    scope.Role == UserRole.Coordinator
                        ? "You can only assign quizzes to students in your attached classes."
                        : "You can only assign quizzes to students in your assigned classes and sections.");
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

            return;
        }

        if (scope.Role == UserRole.CampusAdmin)
        {
            var context = await studentScope.GetStudentSchoolContextAsync(studentId, cancellationToken)
                ?? throw new ForbiddenAppException("Student school context was not found.");
            if (scope.SchoolId != context.SchoolId || scope.CampusId != context.CampusId)
            {
                throw new ForbiddenAppException("You can only assign quizzes to students in your campus.");
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
