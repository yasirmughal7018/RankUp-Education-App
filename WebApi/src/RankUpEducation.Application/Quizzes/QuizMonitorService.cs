using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Contracts.Quizzes;

namespace RankUpEducation.Application.Quizzes;

/// <summary>Assignment board and per-quiz monitoring for quiz owners and school/platform admins.</summary>
public interface IQuizMonitorService
{
    /// <summary>Lists assignments across scoped quizzes with live monitor status.</summary>
    Task<QuizAssignmentBoardResponse> ListAssignmentsAsync(
        long? studentId,
        CancellationToken cancellationToken);

    /// <summary>Returns per-student attempt/review progress for one quiz.</summary>
    Task<QuizMonitoringResponse> GetMonitoringAsync(long quizId, CancellationToken cancellationToken);
}

/// <inheritdoc cref="IQuizMonitorService"/>
public sealed class QuizMonitorService : IQuizMonitorService
{
    private readonly IQuizRepository _quizzes;
    private readonly IQuizAssignmentRepository _assignments;
    private readonly IQuizReviewRepository _reviews;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _dateTimeProvider;

    public QuizMonitorService(
        IQuizRepository quizzes,
        IQuizAssignmentRepository assignments,
        IQuizReviewRepository reviews,
        ICurrentUserService currentUser,
        IDateTimeProvider dateTimeProvider)
    {
        _quizzes = quizzes;
        _assignments = assignments;
        _reviews = reviews;
        _currentUser = currentUser;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<QuizAssignmentBoardResponse> ListAssignmentsAsync(
        long? studentId,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        var (creatorUserId, schoolId) = QuizScopeResolver.ResolveOwnerListFilter(scope);
        var items = await _assignments.ListAssignmentBoardAsync(
            creatorUserId,
            schoolId,
            studentId,
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
                item.LastSubmittedAt))).ToArray());
    }

    public async Task<QuizMonitoringResponse> GetMonitoringAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");
        QuizScopeResolver.EnsureOwnsQuiz(quiz, scope);

        if (!quiz.IsActive || quiz.IsDeleted)
        {
            throw new NotFoundAppException("Quiz was not found.");
        }

        var students = await _reviews.ListMonitoringForQuizAsync(quizId, cancellationToken);
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
            item.ClipboardPasteCount)).ToArray();

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
