using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Lookups;
using RankUpEducation.Contracts.Quizzes;

namespace RankUpEducation.Application.Quizzes;

/// <summary>Assignment board and per-quiz monitoring for the caller's students/children.</summary>
public interface IQuizMonitorService
{
    /// <summary>Lists assignments across scoped students with live monitor status.</summary>
    Task<QuizAssignmentBoardResponse> ListAssignmentsAsync(
        long? studentId,
        CancellationToken cancellationToken);

    /// <summary>Returns per-student attempt/review progress for one quiz (in-scope students only).</summary>
    Task<QuizMonitoringResponse> GetMonitoringAsync(long quizId, CancellationToken cancellationToken);
}

/// <inheritdoc cref="IQuizMonitorService"/>
public sealed class QuizMonitorService : IQuizMonitorService
{
    private readonly IQuizRepository _quizzes;
    private readonly IQuizAssignmentRepository _assignments;
    private readonly IQuizReviewRepository _reviews;
    private readonly IStudentScopeRepository _studentScope;
    private readonly ILookupRepository _lookups;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _dateTimeProvider;

    public QuizMonitorService(
        IQuizRepository quizzes,
        IQuizAssignmentRepository assignments,
        IQuizReviewRepository reviews,
        IStudentScopeRepository studentScope,
        ILookupRepository lookups,
        ICurrentUserService currentUser,
        IDateTimeProvider dateTimeProvider)
    {
        _quizzes = quizzes;
        _assignments = assignments;
        _reviews = reviews;
        _studentScope = studentScope;
        _lookups = lookups;
        _currentUser = currentUser;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<QuizAssignmentBoardResponse> ListAssignmentsAsync(
        long? studentId,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        if (studentId is > 0)
        {
            await QuizScopeResolver.EnsureCanAccessStudentAsync(
                _studentScope,
                scope,
                studentId.Value,
                cancellationToken);
        }

        var (studentIds, assignedByUserId) = await QuizScopeResolver.ResolveAssignmentViewFilterAsync(
            _studentScope,
            scope,
            cancellationToken);
        var items = await _assignments.ListAssignmentBoardAsync(
            studentIds,
            assignedByUserId,
            studentId is > 0 ? studentId : null,
            cancellationToken);
        var now = _dateTimeProvider.UtcNow;

        return new QuizAssignmentBoardResponse(items.Select(item => new QuizAssignmentBoardItemResponse(
            item.AssignmentId,
            item.QuizId,
            item.QuizTitle,
            item.StudentId,
            item.StudentName,
            item.StartDateTime,
            item.EndDateTime,
            item.AllowedAttempts,
            item.AttemptCount,
            item.IsReviewDone,
            item.ResultStatusName,
            QuizStatusCalculator.ResolveMonitorStatus(
                now,
                item.StartDateTime,
                item.EndDateTime,
                item.AttemptCount,
                item.IsReviewDone,
                item.LastSubmittedAt),
            item.LastAttemptId,
            QuizReviewAuthorizationRules.CanScore(scope.Role, item.AssignedByRole))).ToArray());
    }

    public async Task<QuizMonitoringResponse> GetMonitoringAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
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

        var (studentIds, assignedByUserId) = await QuizScopeResolver.ResolveAssignmentViewFilterAsync(
            _studentScope,
            scope,
            cancellationToken);

        // Allow monitoring for inactive/archived quizzes so owners can still review past attempts.
        // Soft-deleted quizzes are already excluded by GetQuizEntityAsync.

        var students = await _reviews.ListMonitoringForQuizAsync(
            quizId,
            studentIds,
            assignedByUserId,
            cancellationToken);
        var now = _dateTimeProvider.UtcNow;

        var studentResponses = students.Select(item => new QuizMonitoringStudentResponse(
            item.StudentId,
            item.StudentName,
            item.AssignmentId,
            item.AttemptCount,
            item.BestPercentage,
            item.IsReviewDone,
            QuizStatusCalculator.ResolveMonitorStatus(
                now,
                item.StartDateTime,
                item.EndDateTime,
                item.AttemptCount,
                item.IsReviewDone,
                item.LastSubmittedAt),
            item.LastSubmittedAt,
            item.FocusLossCount,
            item.ClipboardPasteCount,
            item.LastAttemptId,
            QuizReviewAuthorizationRules.CanScore(scope.Role, item.AssignedByRole))).ToArray();

        return new QuizMonitoringResponse(
            quiz.Id,
            quiz.QuizTitle,
            (short)studentResponses.Length,
            (short)studentResponses.Count(item => item.LastSubmittedAt is not null),
            (short)studentResponses.Count(item => item.Status == "pending_review"),
            (short)studentResponses.Count(item => item.IsReviewDone),
            studentResponses);
    }
}
