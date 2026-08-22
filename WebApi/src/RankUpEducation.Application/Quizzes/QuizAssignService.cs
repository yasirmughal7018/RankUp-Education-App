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
    /// <summary>Creates per-student assignments and moves quiz lifecycle to Assigned.</summary>
    Task<AssignQuizResponse> AssignAsync(long quizId, AssignQuizRequest request, CancellationToken cancellationToken);

    /// <summary>Lists all assignments for a quiz owned by the caller.</summary>
    Task<QuizAssignmentListResponse> ListAssignmentsAsync(long quizId, CancellationToken cancellationToken);

    /// <summary>Removes upcoming assignments and sets lifecycle to Cancelled.</summary>
    Task<CancelQuizResponse> CancelAsync(long quizId, CancellationToken cancellationToken);

    /// <summary>Grants extra attempts after review is done and all allowed attempts were used.</summary>
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
        INotificationService notifications)
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
    }

    public async Task<AssignQuizResponse> AssignAsync(
        long quizId,
        AssignQuizRequest request,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireAssignScope(_currentUser);
        var quiz = await RequireAssignableQuizAsync(quizId, scope, cancellationToken);
        ValidateAssignRequest(request);

        if (await _quizzes.IsParentPrivateQuizTypeAsync(quiz.QuizTypeId, cancellationToken))
        {
            if (scope.Role != UserRole.Parent)
            {
                throw new ForbiddenAppException("Only parents can assign ParentPrivate quizzes.");
            }

            var privateMode = request.Mode.AsLowercase();
            if (privateMode is "allingrade" or "allinsection" or "allinschool" or "multischool" or "public")
            {
                throw new ValidationAppException(["ParentPrivate quizzes can only target linked children."]);
            }
        }

        var quizTypeName = await _lookups.GetLookupNameAsync(quiz.QuizTypeId, cancellationToken);
        QuizTypeBehavior.EnsureAssignable(
            quizTypeName,
            quiz.TimeLimitMinutes,
            request.AllowedAttempts,
            request.StartAt,
            request.EndAt,
            _dateTimeProvider.UtcNow);

        var mode = request.Mode.AsLowercase();
        if (mode == "public")
        {
            if (scope.Role is not (UserRole.PortalAdmin or UserRole.SchoolAdmin))
            {
                throw new ForbiddenAppException(
                    "Only school or portal administrators can publish public catalog quizzes.");
            }

            quiz.SetAudienceAccess("Public", request.StartAt, request.EndAt, request.AllowedAttempts);
            var publicLifecycleId = await RequireLookupAsync(
                LookupNames.QuizLifecycleStatus,
                LookupNames.AssignedLifecycleNames,
                cancellationToken);
            quiz.SetLifecycleStatus(publicLifecycleId);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
            return new AssignQuizResponse(quizId, lifecycleName, 0, Array.Empty<QuizAssignmentResponse>());
        }

        var studentIds = await ResolveTargetStudentIdsAsync(scope, request, cancellationToken);
        if (studentIds.Count == 0)
        {
            throw new ValidationAppException(["No valid students were found for this assignment."]);
        }

        var now = _dateTimeProvider.UtcNow;
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
        var assignedLifecycleId = await RequireLookupAsync(
            LookupNames.QuizLifecycleStatus,
            LookupNames.AssignedLifecycleNames,
            cancellationToken);

        var assignments = new List<QuizAssignment>();
        foreach (var studentId in studentIds)
        {
            if (await _assignments.AssignmentExistsAsync(quizId, studentId, cancellationToken))
            {
                continue;
            }

            var assignment = new QuizAssignment(
                quizId,
                studentId,
                scope.UserId,
                request.StartAt,
                request.EndAt,
                request.AllowedAttempts,
                resultStatusId);

            if (request.Mode.Equals("group", StringComparison.OrdinalIgnoreCase) && request.GroupId is not null)
            {
                assignment.AssignToGroup(request.GroupId.Value);
            }

            assignments.Add(assignment);
        }

        if (assignments.Count == 0)
        {
            throw new BusinessRuleException("All selected students already have assignments for this quiz.");
        }

        await _assignments.AddAssignmentsAsync(assignments, cancellationToken);

        quiz.SetLifecycleStatus(assignedLifecycleId);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Surprise quizzes stay hidden until StartAt — notify only when the window is already open.
        if (!QuizTypeBehavior.IsSurprise(quizTypeName) || request.StartAt <= now)
        {
            await _notifications.CreateAsync(
                studentIds,
                "New quiz assigned",
                $"\"{quiz.QuizTitle}\" has been assigned to you. Open My Quizzes to start.",
                QuizNotificationCategories.QuizAssigned,
                cancellationToken);
        }

        var createdAssignments = await _assignments.ListAssignmentsForQuizAsync(quizId, cancellationToken);
        var assignedLifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);

        return new AssignQuizResponse(
            quizId,
            assignedLifecycleName,
            assignments.Count,
            createdAssignments.Select(QuizManageMapping.ToAssignmentResponse).ToArray());
    }

    public async Task<QuizAssignmentListResponse> ListAssignmentsAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireAssignScope(_currentUser);
        await RequireOwnedQuizAsync(quizId, scope, cancellationToken);

        var expired = await _assignments.ExpireOverdueUnattemptedAsync(_dateTimeProvider.UtcNow, cancellationToken);
        if (expired.ChangedCount > 0)
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await QuizSurpriseNotifications.NotifyNewlyOpenedAsync(
                _notifications,
                expired.NewlyOpenedSurpriseAssignments,
                cancellationToken);
        }

        var assignments = await _assignments.ListAssignmentsForQuizAsync(quizId, cancellationToken);
        return new QuizAssignmentListResponse(assignments.Select(QuizManageMapping.ToAssignmentResponse).ToArray());
    }

    public async Task<CancelQuizResponse> CancelAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        var quiz = await RequireOwnedQuizAsync(quizId, scope, cancellationToken);
        var now = _dateTimeProvider.UtcNow;

        var removed = await _assignments.RemoveFutureAssignmentsAsync(quizId, now, cancellationToken);
        if (removed == 0)
        {
            throw new BusinessRuleException("No upcoming assignments were found to cancel.");
        }

        // Cancelled is not a quiz lifecycle — restore Assigned or Published from remaining rows.
        var hasAssignments = await _quizzes.HasAnyAssignmentsAsync(quizId, cancellationToken);
        var restoredLifecycleId = await RequireLookupAsync(
            LookupNames.QuizLifecycleStatus,
            hasAssignments
                ? LookupNames.AssignedLifecycleNames
                : LookupNames.PublishedLifecycleNames,
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
        await RequireOwnedQuizAsync(quizId, scope, cancellationToken);

        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");

        await EnsureNotArchivedAsync(quiz, cancellationToken);

        var assignment = await _assignments.GetAssignmentEntityByIdAsync(assignmentId, quizId, cancellationToken)
            ?? throw new NotFoundAppException("Assignment was not found.");

        if (!assignment.IsReviewDone)
        {
            throw new BusinessRuleException("Review must be finalized before allowing a retry.");
        }

        var attemptCount = await _attempts.CountAttemptsAsync(quizId, assignment.StudentId, cancellationToken);
        if (attemptCount < assignment.AllowedAttempts)
        {
            throw new BusinessRuleException("Student still has remaining attempts on this assignment.");
        }

        var extraAttempts = request.ExtraAttempts <= 0 ? (short)1 : request.ExtraAttempts;
        assignment.GrantRetry(extraAttempts);

        // Retry quota is open, but the student has not started the new attempt yet.
        var notAttemptedResultId = await _lookups.ResolveLookupIdByNamesAsync(
            LookupNames.QuizResultStatus,
            LookupNames.AssignedResultNames,
            LookupNames.QuizResultStatusIds.NotAttempted,
            cancellationToken);
        assignment.SetResultStatus(notAttemptedResultId);

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
            throw new BusinessRuleException("Quiz must be published or assigned before it can be assigned to students.");
        }

        if (quiz.TotalQuestions <= 0)
        {
            throw new BusinessRuleException("Quiz must contain at least one question before assignment.");
        }

        if (scope.Role is UserRole.Teacher or UserRole.Coordinator or UserRole.SchoolAdmin or UserRole.PortalAdmin)
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
        else if (await _quizzes.IsParentPrivateQuizTypeAsync(quiz.QuizTypeId, cancellationToken)
            && scope.Role == UserRole.Parent)
        {
            var approvalName = await _lookups.GetLookupNameAsync(quiz.ApprovalStatusId, cancellationToken);
            if (!LookupNames.IsFinalApprovedName(approvalName))
            {
                throw new BusinessRuleException(
                    "Parent quizzes must be approved by a portal admin before assignment.");
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

        // Public catalog quizzes may be viewed/assigned by any assign-capable role.
        if (quiz.AudienceScope.Equals("Public", StringComparison.OrdinalIgnoreCase)
            && scope.Role is UserRole.Teacher or UserRole.Coordinator or UserRole.SchoolAdmin or UserRole.CampusAdmin or UserRole.PortalAdmin or UserRole.Parent)
        {
            return quiz;
        }

        QuizScopeResolver.EnsureOwnsQuiz(quiz, scope);
        return quiz;
    }

    private async Task<IReadOnlyList<long>> ResolveTargetStudentIdsAsync(
        QuizManageScope scope,
        AssignQuizRequest request,
        CancellationToken cancellationToken)
    {
        var mode = request.Mode.AsLowercase();

        if (scope.Role == UserRole.Parent)
        {
            return mode switch
            {
                "one" => await ResolveOneStudentAsync(scope, request, cancellationToken),
                "selected" => await ResolveSelectedStudentsAsync(scope, request, cancellationToken),
                "alllinked" => await _studentScope.GetLinkedStudentIdsAsync(scope.ParentId, cancellationToken),
                "group" => await ResolveGroupStudentsAsync(scope, request, UserRole.Parent, cancellationToken),
                _ => throw new ValidationAppException([$"Assignment mode '{request.Mode}' is not supported."])
            };
        }

        if (scope.Role == UserRole.Tutor)
        {
            return mode switch
            {
                "one" => await ResolveOneStudentAsync(scope, request, cancellationToken),
                "selected" => await ResolveSelectedStudentsAsync(scope, request, cancellationToken),
                "alllinked" => await _studentScope.GetTutorLinkedStudentIdsAsync(scope.ProfileId, cancellationToken),
                _ => throw new ValidationAppException([$"Assignment mode '{request.Mode}' is not supported."])
            };
        }

        if (scope.Role == UserRole.SchoolAdmin)
        {
            return mode switch
            {
                "one" => await ResolveOneStudentAsync(scope, request, cancellationToken),
                "selected" => await ResolveSelectedStudentsAsync(scope, request, cancellationToken),
                "allinschool" => await ResolveAllInSchoolStudentsAsync(scope, request, cancellationToken),
                _ => throw new ValidationAppException([$"Assignment mode '{request.Mode}' is not supported for school admins."])
            };
        }

        if (scope.Role == UserRole.PortalAdmin)
        {
            return mode switch
            {
                "one" => await ResolveOneStudentAsync(scope, request, cancellationToken),
                "selected" => await ResolveSelectedStudentsAsync(scope, request, cancellationToken),
                "allinschool" => await ResolveAllInSchoolStudentsAsync(scope, request, cancellationToken),
                "multischool" => await ResolveMultiSchoolStudentsAsync(request, cancellationToken),
                _ => throw new ValidationAppException([$"Assignment mode '{request.Mode}' is not supported for portal admins."])
            };
        }

        return mode switch
        {
            "one" => await ResolveOneStudentAsync(scope, request, cancellationToken),
            "selected" => await ResolveSelectedStudentsAsync(scope, request, cancellationToken),
            "group" => await ResolveGroupStudentsAsync(scope, request, UserRole.Teacher, cancellationToken),
            "allingrade" => await ResolveAllInGradeStudentsAsync(scope, request, cancellationToken),
            "allinsection" => await ResolveAllInSectionStudentsAsync(scope, request, cancellationToken),
            _ => throw new ValidationAppException([$"Assignment mode '{request.Mode}' is not supported for teachers."])
        };
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

        var studentIds = await _studentScope.GetStudentIdsInCampusByGradeAndSectionAsync(
            scope.SchoolId!.Value,
            scope.CampusId!.Value,
            request.GradeId.Value,
            request.Section,
            cancellationToken);

        if (scope.Role is not (UserRole.Teacher or UserRole.Coordinator))
        {
            return studentIds;
        }

        return await FilterToTeacherRosterAsync(scope, studentIds, cancellationToken);
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

        var studentIds = await _studentScope.GetStudentIdsInSchoolByGradeAsync(
            scope.SchoolId!.Value,
            scope.CampusId!.Value,
            request.GradeId.Value,
            cancellationToken);

        if (scope.Role is not (UserRole.Teacher or UserRole.Coordinator))
        {
            return studentIds;
        }

        return await FilterToTeacherRosterAsync(scope, studentIds, cancellationToken);
    }

    private async Task<IReadOnlyList<long>> FilterToTeacherRosterAsync(
        QuizManageScope scope,
        IReadOnlyList<long> studentIds,
        CancellationToken cancellationToken)
    {
        var rosterIds = await _studentScope.GetTeacherRosterStudentIdsAsync(
            scope.ProfileId,
            scope.SchoolId!.Value,
            scope.CampusId!.Value,
            cancellationToken);
        var rosterSet = rosterIds.ToHashSet();
        return studentIds.Where(rosterSet.Contains).ToArray();
    }

    private static bool IsAssignableLifecycle(string lifecycleName)
        => lifecycleName.Equals("Published", StringComparison.OrdinalIgnoreCase)
            || lifecycleName.Equals("Assigned", StringComparison.OrdinalIgnoreCase);

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

        if (request.AllowedAttempts <= 0)
        {
            errors.Add("Allowed attempts must be greater than zero.");
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
