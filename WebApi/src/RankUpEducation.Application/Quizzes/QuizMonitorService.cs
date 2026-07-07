using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Contracts.Quizzes;

namespace RankUpEducation.Application.Quizzes;

public interface IQuizMonitorService
{
    Task<QuizAssignmentBoardResponse> ListAssignmentsAsync(
        long? studentId,
        CancellationToken cancellationToken);

    Task<QuizMonitoringResponse> GetMonitoringAsync(long quizId, CancellationToken cancellationToken);
}

public sealed class QuizMonitorService : IQuizMonitorService
{
    private readonly IQuizRepository _quizzes;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _dateTimeProvider;

    public QuizMonitorService(
        IQuizRepository quizzes,
        ICurrentUserService currentUser,
        IDateTimeProvider dateTimeProvider)
    {
        _quizzes = quizzes;
        _currentUser = currentUser;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<QuizAssignmentBoardResponse> ListAssignmentsAsync(
        long? studentId,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        var items = await _quizzes.ListAssignmentBoardForCreatorAsync(scope.UserId, studentId, cancellationToken);
        var now = _dateTimeProvider.UtcNow;

        return new QuizAssignmentBoardResponse(items.Select(item => new QuizAssignmentBoardItemResponse(
            item.AssignmentId,
            item.QuizId,
            item.QuizTitle,
            item.StudentId,
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
        var quiz = await _quizzes.GetDetailForCreatorAsync(quizId, scope.UserId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");

        var students = await _quizzes.ListMonitoringForQuizAsync(quizId, scope.UserId, cancellationToken);
        var now = _dateTimeProvider.UtcNow;

        var studentResponses = students.Select(item => new QuizMonitoringStudentResponse(
            item.StudentId,
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
            item.LastSubmittedAt)).ToArray();

        return new QuizMonitoringResponse(
            quiz.QuizId,
            quiz.QuizTitle,
            (short)studentResponses.Length,
            (short)studentResponses.Count(item => item.LastSubmittedAt is not null),
            (short)studentResponses.Count(item => item.Status == "pending_review"),
            (short)studentResponses.Count(item => item.IsReviewDone),
            studentResponses);
    }
}
