using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Lookups;
using RankUpEducation.Application.Notifications;
using RankUpEducation.Common.Utilities;
using RankUpEducation.Contracts.Quizzes;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Quizzes;

/// <summary>
/// Assigns published quizzes to students (one, selected, group, grade, or all linked children),
/// cancels future assignments, and grants retries after review.
/// </summary>
public interface IQuizAssignService
{
    /// <summary>Creates per-student assignments. Quiz lifecycle stays Published.</summary>
    Task<AssignQuizResponse> AssignAsync(long quizId, AssignQuizRequest request, CancellationToken cancellationToken);

    /// <summary>Lists assignments for a quiz that are in the caller's student/child scope.</summary>
    Task<QuizAssignmentListResponse> ListAssignmentsAsync(long quizId, CancellationToken cancellationToken);

    /// <summary>Removes upcoming assignments created by the caller. Quiz stays Published.</summary>
    Task<CancelQuizResponse> CancelAsync(long quizId, CancellationToken cancellationToken);

    /// <summary>Grants extra attempts after the student used their quota. Does not overwrite prior attempts.</summary>
    Task<AllowRetryResponse> AllowRetryAsync(
        long quizId,
        long assignmentId,
        AllowRetryRequest request,
        CancellationToken cancellationToken);
}

/// <inheritdoc cref="IQuizAssignService"/>
public sealed class QuizAssignService : IQuizAssignService
{
    private readonly IQuizRepository _quizzes;
    private readonly IQuizAssignmentRepository _assignments;
    private readonly IQuizAttemptRepository _attempts;
    private readonly ILookupRepository _lookups;
    private readonly IStudentScopeRepository _studentScope;
    private readonly IUserRepository _users;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly INotificationService _notifications;
    private readonly IQuizOverdueAttemptCloser _overdueCloser;

    public QuizAssignService(
        IQuizRepository quizzes,
        IQuizAssignmentRepository assignments,
        IQuizAttemptRepository attempts,
        ILookupRepository lookups,
        IStudentScopeRepository studentScope,
        IUserRepository users,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IDateTimeProvider dateTimeProvider,
        INotificationService notifications,
        IQuizOverdueAttemptCloser overdueCloser)
    {
        _quizzes = quizzes;
        _assignments = assignments;
        _attempts = attempts;
        _lookups = lookups;
        _studentScope = studentScope;
        _users = users;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _dateTimeProvider = dateTimeProvider;
        _notifications = notifications;
        _overdueCloser = overdueCloser;
    }

    public async Task<AssignQuizResponse> AssignAsync(
        long quizId,
        AssignQuizRequest request,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireAssignScope(_currentUser);
        var quiz = await RequireAssignableQuizAsync(quizId, scope, cancellationToken);
        ValidateAssignRequest(request);

        var quizTypeName = await _lookups.GetLookupNameAsync(quiz.QuizTypeId, cancellationToken);
        QuizTypeBehavior.EnsureAssignable(
            quizTypeName,
            quiz.TimeLimitMinutes,
            QuizTypeBehavior.SingleAllowedAttempt,
            request.StartAt,
            request.EndAt,
            _dateTimeProvider.UtcNow);

        var mode = request.Mode.AsLowercase();
        if (mode == "public")
        {
            if (scope.Role != UserRole.PortalAdmin)
            {
                throw new ForbiddenAppException(
                    "Only portal administrators can publish public catalog quizzes.");
            }

            quiz.SetAudienceAccess(
                "Public",
                request.StartAt,
                request.EndAt,
                QuizTypeBehavior.SingleAllowedAttempt);
            var publishedLifecycleId = await RequireLookupAsync(
                LookupNames.QuizLifecycleStatus,
                LookupNames.PublishedLifecycleNames,
                cancellationToken);
            quiz.SetLifecycleStatus(publishedLifecycleId);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return new AssignQuizResponse(quizId, "Published", 0, Array.Empty<QuizAssignmentResponse>());
        }

        var studentIds = await ResolveTargetStudentIdsAsync(scope, request, cancellationToken);
        if (studentIds.Count == 0)
        {
            throw new ValidationAppException(["No valid students were found for this assignment."]);
        }

        var now = _dateTimeProvider.UtcNow;
        var expiredMaintenance = await _assignments.ExpireOverdueUnattemptedAsync(now, cancellationToken);
        if (expiredMaintenance.ChangedCount > 0)
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await QuizSurpriseNotifications.NotifyNewlyOpenedAsync(
                _notifications,
                expiredMaintenance.NewlyOpenedSurpriseAssignments,
                cancellationToken);
        }

        await _overdueCloser.CloseOverdueInProgressAttemptsAsync(now, cancellationToken);

        var resultStatusId = request.StartAt > now
            ? await _lookups.ResolveLookupIdByNamesAsync(
                LookupNames.QuizResultStatus,
                LookupNames.UpcomingResultNames,
                LookupNames.QuizResultStatusIds.Upcoming,
                cancellationToken)
            : await _lookups.ResolveLookupIdByNamesAsync(
                LookupNames.QuizResultStatus,
                LookupNames.AssignedResultNames,
                LookupNames.QuizResultStatusIds.NotAttempted,
                cancellationToken);

        var existingByStudent = (await _assignments.GetAssignmentEntitiesForStudentsAsync(
                quizId,
                studentIds,
                cancellationToken))
            .GroupBy(assignment => assignment.StudentId)
            .ToDictionary(group => group.Key, group => group.First());

        var created = new List<QuizAssignment>();
        var notifyStudentIds = new List<long>();
        var reopenedCount = 0;
        var isGroupAssign = request.Mode.Equals("group", StringComparison.OrdinalIgnoreCase)
            && request.GroupId is not null;

        foreach (var studentId in studentIds)
        {
            if (existingByStudent.TryGetValue(studentId, out var existing))
            {
                var attemptCount = await _attempts.CountAttemptsAsync(quizId, studentId, cancellationToken);
                var quota = (short)Math.Min(
                    short.MaxValue,
                    QuizTypeBehavior.SingleAllowedAttempt + attemptCount);
                if (attemptCount > 0)
                {
                    existing.GrantReassignAttempts(
                        scope.UserId,
                        scope.Role,
                        request.StartAt,
                        request.EndAt,
                        quota,
                        resultStatusId);
                }
                else
                {
                    existing.ReopenForReassign(
                        scope.UserId,
                        scope.Role,
                        request.StartAt,
                        request.EndAt,
                        quota,
                        resultStatusId);
                }

                if (isGroupAssign)
                {
                    existing.AssignToGroup(request.GroupId!.Value);
                }

                reopenedCount++;
                notifyStudentIds.Add(studentId);
                continue;
            }

            var assignment = new QuizAssignment(
                quizId,
                studentId,
                scope.UserId,
                scope.Role,
                request.StartAt,
                request.EndAt,
                QuizTypeBehavior.SingleAllowedAttempt,
                resultStatusId);

            if (isGroupAssign)
            {
                assignment.AssignToGroup(request.GroupId!.Value);
            }

            created.Add(assignment);
            notifyStudentIds.Add(studentId);
        }

        if (created.Count == 0 && reopenedCount == 0)
        {
            throw new BusinessRuleException(
                "All selected students already have active assignments for this quiz.");
        }

        if (created.Count > 0)
        {
            await _assignments.AddAssignmentsAsync(created, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Surprise quizzes stay hidden until StartAt — notify only when the window is already open.
        if (notifyStudentIds.Count > 0
            && (!QuizTypeBehavior.IsSurprise(quizTypeName) || request.StartAt <= now))
        {
            await _notifications.CreateAsync(
                notifyStudentIds,
                "New quiz assigned",
                $"\"{quiz.QuizTitle}\" has been assigned to you. Open My Quizzes to start.",
                QuizNotificationCategories.QuizAssigned,
                cancellationToken);
        }

        var createdAssignments = await ListScopedAssignmentsAsync(quizId, scope, cancellationToken);
        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        if (LookupNames.IsPublishedLifecycleName(lifecycleName))
        {
            lifecycleName = "Published";
        }

        return new AssignQuizResponse(
            quizId,
            lifecycleName,
            created.Count + reopenedCount,
            createdAssignments.Select(item => QuizManageMapping.ToAssignmentResponse(item, scope.Role)).ToArray());
    }

    public async Task<QuizAssignmentListResponse> ListAssignmentsAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireAssignScope(_currentUser);
        await RequireViewableQuizAsync(quizId, scope, cancellationToken);

        var now = _dateTimeProvider.UtcNow;
        var expired = await _assignments.ExpireOverdueUnattemptedAsync(now, cancellationToken);
        if (expired.ChangedCount > 0)
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await QuizSurpriseNotifications.NotifyNewlyOpenedAsync(
                _notifications,
                expired.NewlyOpenedSurpriseAssignments,
                cancellationToken);
        }

        await _overdueCloser.CloseOverdueInProgressAttemptsAsync(now, cancellationToken);

        var assignments = await ListScopedAssignmentsAsync(quizId, scope, cancellationToken);
        return new QuizAssignmentListResponse(assignments.Select(item => QuizManageMapping.ToAssignmentResponse(item, scope.Role)).ToArray());
    }

    public async Task<CancelQuizResponse> CancelAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        var quiz = await RequireViewableQuizAsync(quizId, scope, cancellationToken);
        var now = _dateTimeProvider.UtcNow;

        var removed = await _assignments.RemoveFutureAssignmentsAsync(
            quizId,
            now,
            scope.UserId,
            cancellationToken);
        if (removed == 0)
        {
            throw new BusinessRuleException(
                "No upcoming assignments that you assigned were found to cancel.");
        }

        // Cancelled is not a quiz lifecycle — stay Published after removing upcoming rows.
        var restoredLifecycleId = await RequireLookupAsync(
            LookupNames.QuizLifecycleStatus,
            LookupNames.PublishedLifecycleNames,
            cancellationToken);
        quiz.SetLifecycleStatus(restoredLifecycleId);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        return new CancelQuizResponse(quizId, lifecycleName, removed);
    }

    public async Task<AllowRetryResponse> AllowRetryAsync(
        long quizId,
        long assignmentId,
        AllowRetryRequest request,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        var quiz = await RequireViewableQuizAsync(quizId, scope, cancellationToken);
        await EnsureNotArchivedAsync(quiz, cancellationToken);

        var assignment = await _assignments.GetAssignmentEntityByIdAsync(assignmentId, quizId, cancellationToken)
            ?? throw new NotFoundAppException("Assignment was not found.");

        await QuizScopeResolver.EnsureCanViewAssignedStudentAsync(
            _studentScope,
            scope,
            assignment.StudentId,
            assignment.AssignedById,
            cancellationToken);

        var attemptCount = await _attempts.CountAttemptsAsync(quizId, assignment.StudentId, cancellationToken);
        if (attemptCount <= 0)
        {
            throw new BusinessRuleException("The student has not attempted this quiz yet.");
        }

        var extraAttempts = request.ExtraAttempts <= 0 ? (short)1 : request.ExtraAttempts;
        assignment.GrantRetry(extraAttempts);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var student = await _users.GetByIdAsync(assignment.StudentId, cancellationToken);

        return new AllowRetryResponse(
            assignment.Id,
            quizId,
            assignment.StudentId,
            student?.FullName ?? $"Student {assignment.StudentId}",
            assignment.AllowedAttempts,
            attemptCount,
            assignment.IsReviewDone);
    }

    private async Task EnsureNotArchivedAsync(Quiz quiz, CancellationToken cancellationToken)
    {
        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        if (lifecycleName.Equals("Archived", StringComparison.OrdinalIgnoreCase))
        {
            throw new BusinessRuleException("Archived quizzes are read-only.");
        }
    }

    private async Task<Quiz> RequireAssignableQuizAsync(
        long quizId,
        QuizManageScope scope,
        CancellationToken cancellationToken)
    {
        var quiz = await RequireOwnedQuizAsync(quizId, scope, cancellationToken);
        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);

        if (lifecycleName.Equals("Archived", StringComparison.OrdinalIgnoreCase))
        {
            throw new BusinessRuleException("Archived quizzes cannot be assigned.");
        }

        if (!IsAssignableLifecycle(lifecycleName))
        {
            throw new BusinessRuleException(
                "Quiz must be published before it can be assigned to students. Wait for portal admin to publish.");
        }

        if (quiz.TotalQuestions <= 0)
        {
            throw new BusinessRuleException("Quiz must contain at least one question before assignment.");
        }

        if (scope.Role is UserRole.Teacher or UserRole.Coordinator or UserRole.CampusAdmin
            or UserRole.SchoolAdmin or UserRole.PortalAdmin
            or UserRole.Parent)
        {
            var approvalName = await _lookups.GetLookupNameAsync(quiz.ApprovalStatusId, cancellationToken);
            if (!QuizAssignRules.CanAssignWithApproval(scope.Role, approvalName))
            {
                throw new BusinessRuleException(
                    scope.Role == UserRole.SchoolAdmin
                        ? "Quizzes must be school-approved or approved before assignment."
                        : "Quizzes must be approved before assignment.");
            }
        }

        return quiz;
    }

    private async Task<Quiz> RequireOwnedQuizAsync(
        long quizId,
        QuizManageScope scope,
        CancellationToken cancellationToken)
    {
        if (quizId <= 0)
        {
            throw new NotFoundAppException("Quiz was not found.");
        }

        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken);
        if (quiz is null)
        {
            throw new NotFoundAppException($"Quiz #{quizId} was not found.");
        }

        // Published school-type catalog may be assigned by teacher/coordinator/parent
        // to their own students or children. SchoolAdmin/CampusAdmin stay org-scoped.
        if (scope.Role is UserRole.Teacher or UserRole.Coordinator or UserRole.Parent)
        {
            return quiz;
        }

        // Public catalog quizzes may be viewed/assigned by any assign-capable role.
        if (quiz.AudienceScope.Equals("Public", StringComparison.OrdinalIgnoreCase)
            && scope.Role is UserRole.Teacher or UserRole.Coordinator or UserRole.SchoolAdmin or UserRole.CampusAdmin or UserRole.PortalAdmin or UserRole.Parent)
        {
            return quiz;
        }

        QuizScopeResolver.EnsureOwnsQuiz(quiz, scope);
        return quiz;
    }

    private async Task<Quiz> RequireViewableQuizAsync(
        long quizId,
        QuizManageScope scope,
        CancellationToken cancellationToken)
    {
        if (quizId <= 0)
        {
            throw new NotFoundAppException("Quiz was not found.");
        }

        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken);
        if (quiz is null)
        {
            throw new NotFoundAppException($"Quiz #{quizId} was not found.");
        }

        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        QuizScopeResolver.EnsureCanViewQuiz(
            quiz,
            scope,
            LookupNames.IsDraftLifecycleName(lifecycleName));
        return quiz;
    }

    private async Task<IReadOnlyList<QuizAssignmentListItem>> ListScopedAssignmentsAsync(
        long quizId,
        QuizManageScope scope,
        CancellationToken cancellationToken)
    {
        var (studentIds, assignedByUserId) = await QuizScopeResolver.ResolveAssignmentViewFilterAsync(
            _studentScope,
            scope,
            cancellationToken);
        return await _assignments.ListAssignmentsForQuizAsync(
            quizId,
            studentIds,
            assignedByUserId,
            cancellationToken);
    }

    private async Task<IReadOnlyList<long>> ResolveTargetStudentIdsAsync(
        QuizManageScope scope,
        AssignQuizRequest request,
        CancellationToken cancellationToken)
    {
        var mode = request.Mode.AsLowercase();
        if (!QuizAssignRules.IsSupportedMode(scope.Role, mode))
        {
            throw new ValidationAppException(
                [$"Assignment mode '{request.Mode}' is not supported for {scope.Role}."]);
        }

        return mode switch
        {
            "one" => await ResolveOneStudentAsync(scope, request, cancellationToken),
            "selected" => await ResolveSelectedStudentsAsync(scope, request, cancellationToken),
            "group" => await ResolveGroupStudentsAsync(scope, request, scope.Role, cancellationToken),
            "alllinked" => await _studentScope.GetLinkedStudentIdsAsync(scope.ParentId, cancellationToken),
            "allattached" => await ResolveAllAttachedStudentsAsync(scope, cancellationToken),
            "allincampus" => await ResolveAllInCampusStudentsAsync(scope, request, cancellationToken),
            "allingrade" => await ResolveAllInGradeStudentsAsync(scope, request, cancellationToken),
            "allinsection" => await ResolveAllInSectionStudentsAsync(scope, request, cancellationToken),
            "allinschool" => await ResolveAllInSchoolStudentsAsync(scope, request, cancellationToken),
            "multischool" => await ResolveMultiSchoolStudentsAsync(request, cancellationToken),
            _ => throw new ValidationAppException([$"Assignment mode '{request.Mode}' is not supported."])
        };
    }

    private async Task<IReadOnlyList<long>> ResolveAllAttachedStudentsAsync(
        QuizManageScope scope,
        CancellationToken cancellationToken)
    {
        if (scope.Role is not (UserRole.Teacher or UserRole.Coordinator))
        {
            throw new ValidationAppException(["All attached classes is only available to teachers and coordinators."]);
        }

        var studentIds = await _studentScope.GetRosterStudentIdsAsync(
            scope.ProfileId,
            scope.SchoolId!.Value,
            scope.CampusId!.Value,
            scope.Role,
            cancellationToken);

        if (studentIds.Count == 0)
        {
            throw new ValidationAppException([
                scope.Role == UserRole.Coordinator
                    ? "No students were found in your attached classes."
                    : "No students were found in your assigned classes."]);
        }

        return studentIds;
    }

    private async Task<IReadOnlyList<long>> ResolveAllInCampusStudentsAsync(
        QuizManageScope scope,
        AssignQuizRequest request,
        CancellationToken cancellationToken)
    {
        var (schoolId, campusId) = ResolveAudienceLocation(scope, request, campusRequired: true);
        return await _studentScope.GetStudentIdsInSchoolAsync(
            schoolId,
            cancellationToken,
            campusId);
    }

    private async Task<IReadOnlyList<long>> ResolveAllInSectionStudentsAsync(
        QuizManageScope scope,
        AssignQuizRequest request,
        CancellationToken cancellationToken)
    {
        if (request.GradeId is null or <= 0)
        {
            throw new ValidationAppException(["Grade id is required for allInSection assignment."]);
        }

        if (string.IsNullOrWhiteSpace(request.Section))
        {
            throw new ValidationAppException(["Section is required for allInSection assignment."]);
        }

        var (schoolId, campusId) = ResolveAudienceLocation(scope, request, campusRequired: true);
        var studentIds = await _studentScope.GetStudentIdsInCampusByGradeAndSectionAsync(
            schoolId,
            campusId!.Value,
            request.GradeId.Value,
            request.Section,
            cancellationToken);

        if (scope.Role is not (UserRole.Teacher or UserRole.Coordinator))
        {
            return studentIds;
        }

        return await FilterToRosterAsync(scope, studentIds, cancellationToken);
    }

    private async Task<IReadOnlyList<long>> ResolveAllInSchoolStudentsAsync(
        QuizManageScope scope,
        AssignQuizRequest request,
        CancellationToken cancellationToken)
    {
        var schoolId = scope.SchoolId
            ?? request.SchoolIds?.FirstOrDefault()
            ?? throw new ValidationAppException(["School id is required for allInSchool assignment."]);

        if (scope.Role == UserRole.SchoolAdmin && scope.SchoolId != schoolId)
        {
            throw new ForbiddenAppException("You can only assign school-wide within your school.");
        }

        var campusId = request.CampusId is > 0
            ? request.CampusId
            : scope.CampusId;
        var gradeId = request.GradeId is > 0 ? request.GradeId : null;

        return await _studentScope.GetStudentIdsInSchoolAsync(
            schoolId,
            cancellationToken,
            campusId,
            gradeId);
    }

    private async Task<IReadOnlyList<long>> ResolveMultiSchoolStudentsAsync(
        AssignQuizRequest request,
        CancellationToken cancellationToken)
    {
        if (request.SchoolIds is null || request.SchoolIds.Count == 0)
        {
            throw new ValidationAppException(["At least one school id is required for multiSchool assignment."]);
        }

        return await _studentScope.GetStudentIdsInSchoolsAsync(
            request.SchoolIds.Distinct().ToArray(),
            cancellationToken);
    }

    private async Task<IReadOnlyList<long>> ResolveOneStudentAsync(
        QuizManageScope scope,
        AssignQuizRequest request,
        CancellationToken cancellationToken)
    {
        var studentId = request.StudentIds?.FirstOrDefault()
            ?? throw new ValidationAppException(["Student id is required for one-student assignment."]);

        await QuizScopeResolver.EnsureCanAccessStudentAsync(_studentScope, scope, studentId, cancellationToken);
        return [studentId];
    }

    private async Task<IReadOnlyList<long>> ResolveSelectedStudentsAsync(
        QuizManageScope scope,
        AssignQuizRequest request,
        CancellationToken cancellationToken)
    {
        if (request.StudentIds is null || request.StudentIds.Count == 0)
        {
            throw new ValidationAppException(["At least one student id is required."]);
        }

        var validIds = new List<long>();
        foreach (var studentId in request.StudentIds.Distinct())
        {
            try
            {
                await QuizScopeResolver.EnsureCanAccessStudentAsync(_studentScope, scope, studentId, cancellationToken);
                validIds.Add(studentId);
            }
            catch (ForbiddenAppException)
            {
                // Skip students outside scope.
            }
        }

        return validIds;
    }

    private async Task<IReadOnlyList<long>> ResolveGroupStudentsAsync(
        QuizManageScope scope,
        AssignQuizRequest request,
        UserRole groupOwnerRole,
        CancellationToken cancellationToken)
    {
        if (request.GroupId is null)
        {
            throw new ValidationAppException(["Group id is required for group assignment."]);
        }

        var memberIds = await _studentScope.GetGroupMemberStudentIdsAsync(
            request.GroupId.Value,
            scope.UserId,
            groupOwnerRole,
            cancellationToken);

        if (memberIds.Count == 0)
        {
            throw new ForbiddenAppException("Group was not found or has no members.");
        }

        var validIds = new List<long>();
        foreach (var studentId in memberIds)
        {
            try
            {
                await QuizScopeResolver.EnsureCanAccessStudentAsync(_studentScope, scope, studentId, cancellationToken);
                validIds.Add(studentId);
            }
            catch (ForbiddenAppException)
            {
                // Skip students outside scope.
            }
        }

        return validIds;
    }

    private async Task<IReadOnlyList<long>> ResolveAllInGradeStudentsAsync(
        QuizManageScope scope,
        AssignQuizRequest request,
        CancellationToken cancellationToken)
    {
        if (request.GradeId is null or <= 0)
        {
            throw new ValidationAppException(["Grade id is required for allInGrade assignment."]);
        }

        var (schoolId, campusId) = ResolveAudienceLocation(scope, request, campusRequired: false);
        IReadOnlyList<long> studentIds;
        if (campusId is > 0)
        {
            studentIds = await _studentScope.GetStudentIdsInSchoolByGradeAsync(
                schoolId,
                campusId.Value,
                request.GradeId.Value,
                cancellationToken);
        }
        else
        {
            studentIds = await _studentScope.GetStudentIdsInSchoolAsync(
                schoolId,
                cancellationToken,
                gradeId: request.GradeId);
        }

        if (scope.Role is not (UserRole.Teacher or UserRole.Coordinator))
        {
            return studentIds;
        }

        return await FilterToRosterAsync(scope, studentIds, cancellationToken);
    }

    private async Task<IReadOnlyList<long>> FilterToRosterAsync(
        QuizManageScope scope,
        IReadOnlyList<long> studentIds,
        CancellationToken cancellationToken)
    {
        var rosterIds = await _studentScope.GetRosterStudentIdsAsync(
            scope.ProfileId,
            scope.SchoolId!.Value,
            scope.CampusId!.Value,
            scope.Role,
            cancellationToken);
        var rosterSet = rosterIds.ToHashSet();
        return studentIds.Where(rosterSet.Contains).ToArray();
    }

    private static (int SchoolId, int? CampusId) ResolveAudienceLocation(
        QuizManageScope scope,
        AssignQuizRequest request,
        bool campusRequired)
    {
        var schoolId = scope.SchoolId
            ?? request.SchoolIds?.FirstOrDefault()
            ?? throw new ValidationAppException(["School id is required for this assignment mode."]);

        if (scope.Role == UserRole.SchoolAdmin && scope.SchoolId != schoolId)
        {
            throw new ForbiddenAppException("You can only assign within your school.");
        }

        var campusId = request.CampusId is > 0
            ? request.CampusId
            : scope.CampusId;

        if (scope.Role == UserRole.CampusAdmin)
        {
            campusId = scope.CampusId;
        }

        if (scope.Role is UserRole.Teacher or UserRole.Coordinator)
        {
            schoolId = scope.SchoolId!.Value;
            campusId = scope.CampusId;
        }

        if (campusRequired && campusId is not > 0)
        {
            throw new ValidationAppException(["Campus is required for this assignment mode."]);
        }

        return (schoolId, campusId);
    }

    private static bool IsAssignableLifecycle(string lifecycleName)
        => LookupNames.IsPublishedLifecycleName(lifecycleName);

    private static void ValidateAssignRequest(AssignQuizRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.Mode))
        {
            errors.Add("Assignment mode is required.");
        }

        if (request.EndAt <= request.StartAt)
        {
            errors.Add("End time must be after start time.");
        }

        if (errors.Count > 0)
        {
            throw new ValidationAppException(errors);
        }
    }

    private async Task<short> RequireLookupAsync(
        string type,
        IReadOnlyList<string> names,
        CancellationToken cancellationToken)
    {
        var id = await _lookups.ResolveLookupIdByNamesAsync(type, names, 0, cancellationToken);
        if (id == 0)
        {
            throw new BusinessRuleException($"Required lookup '{type}' ({string.Join(", ", names)}) was not found.");
        }

        return id;
    }
}
