using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Common.Utilities;
using RankUpEducation.Contracts.Quizzes;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Quizzes;

public interface IQuizAssignService
{
    Task<AssignQuizResponse> AssignAsync(long quizId, AssignQuizRequest request, CancellationToken cancellationToken);

    Task<QuizAssignmentListResponse> ListAssignmentsAsync(long quizId, CancellationToken cancellationToken);

    Task<CancelQuizResponse> CancelAsync(long quizId, CancellationToken cancellationToken);

    Task<AllowRetryResponse> AllowRetryAsync(
        long quizId,
        long assignmentId,
        AllowRetryRequest request,
        CancellationToken cancellationToken);
}

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

    public QuizAssignService(
        IQuizRepository quizzes,
        IQuizAssignmentRepository assignments,
        IQuizAttemptRepository attempts,
        ILookupRepository lookups,
        IStudentScopeRepository studentScope,
        IUserRepository users,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IDateTimeProvider dateTimeProvider)
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
    }

    public async Task<AssignQuizResponse> AssignAsync(
        long quizId,
        AssignQuizRequest request,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        var quiz = await RequireAssignableQuizAsync(quizId, scope, cancellationToken);
        ValidateAssignRequest(request);

        var studentIds = await ResolveTargetStudentIdsAsync(scope, request, cancellationToken);
        if (studentIds.Count == 0)
        {
            throw new ValidationAppException(["No valid students were found for this assignment."]);
        }

        var resultStatusId = await RequireLookupAsync(
            QuizLookupNames.QuizResultStatus,
            QuizLookupNames.AssignedResultNames,
            cancellationToken);
        var assignedLifecycleId = await RequireLookupAsync(
            QuizLookupNames.QuizLifecycleStatus,
            QuizLookupNames.AssignedLifecycleNames,
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

        var createdAssignments = await _assignments.ListAssignmentsForQuizAsync(quizId, cancellationToken);
        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);

        return new AssignQuizResponse(
            quizId,
            lifecycleName,
            assignments.Count,
            createdAssignments.Select(QuizManageMapping.ToAssignmentResponse).ToArray());
    }

    public async Task<QuizAssignmentListResponse> ListAssignmentsAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        await RequireOwnedQuizAsync(quizId, scope, cancellationToken);

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

        var cancelledLifecycleId = await RequireLookupAsync(
            QuizLookupNames.QuizLifecycleStatus,
            QuizLookupNames.CancelledLifecycleNames,
            cancellationToken);
        quiz.SetLifecycleStatus(cancelledLifecycleId);

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

        if (scope.Role == UserRole.Teacher)
        {
            var approvalName = await _lookups.GetLookupNameAsync(quiz.ApprovalStatusId, cancellationToken);
            if (!approvalName.Equals("Approved", StringComparison.OrdinalIgnoreCase))
            {
                throw new BusinessRuleException("Teacher quizzes must be approved before assignment.");
            }
        }

        return quiz;
    }

    private async Task<Quiz> RequireOwnedQuizAsync(
        long quizId,
        QuizManageScope scope,
        CancellationToken cancellationToken)
    {
        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");

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

        return mode switch
        {
            "one" => await ResolveOneStudentAsync(scope, request, cancellationToken),
            "selected" => await ResolveSelectedStudentsAsync(scope, request, cancellationToken),
            "group" => await ResolveGroupStudentsAsync(scope, request, UserRole.Teacher, cancellationToken),
            "allingrade" => await ResolveAllInGradeStudentsAsync(scope, request, cancellationToken),
            _ => throw new ValidationAppException([$"Assignment mode '{request.Mode}' is not supported for teachers."])
        };
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
            groupOwnerRole.ToString().ToLowerInvariant(),
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

        return await _studentScope.GetStudentIdsInSchoolByGradeAsync(
            scope.SchoolId!.Value,
            scope.CampusId!.Value,
            request.GradeId.Value,
            cancellationToken);
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
