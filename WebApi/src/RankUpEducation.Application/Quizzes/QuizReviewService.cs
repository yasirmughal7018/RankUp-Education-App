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
/// Teacher/parent review of submitted attempts: list pending, mark subjective answers,
/// and finalize to release masked student results.
/// </summary>
public interface IQuizReviewService
{
    /// <summary>Lists submitted attempts awaiting review for quizzes in the caller's manage scope.</summary>
    Task<PendingReviewListResponse> ListPendingAsync(CancellationToken cancellationToken);

    /// <summary>Returns attempt answers, auto-scores, and existing feedback for manual review.</summary>
    Task<AttemptReviewResponse> GetReviewDetailAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken);

    /// <summary>Adjusts awarded marks and records teacher/parent feedback per question. Rejected after Completed.</summary>
    Task<AttemptReviewResponse> MarkAnswersAsync(
        long quizId,
        long attemptId,
        MarkAttemptAnswersRequest request,
        CancellationToken cancellationToken);

    /// <summary>Recalculates attempt score and marks assignment review complete.</summary>
    Task<FinalizeReviewResponse> FinalizeAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken);
}

/// <inheritdoc cref="IQuizReviewService"/>
public sealed class QuizReviewService : IQuizReviewService
{
    private readonly IQuizRepository _quizzes;
    private readonly IQuizReviewRepository _reviews;
    private readonly IQuizAttemptRepository _attempts;
    private readonly IQuizAssignmentRepository _assignments;
    private readonly ILookupRepository _lookups;
    private readonly IStudentScopeRepository _studentScope;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly INotificationService _notifications;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly IQuizOverdueAttemptCloser _overdueCloser;

    public QuizReviewService(
        IQuizRepository quizzes,
        IQuizReviewRepository reviews,
        IQuizAttemptRepository attempts,
        IQuizAssignmentRepository assignments,
        ILookupRepository lookups,
        IStudentScopeRepository studentScope,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        INotificationService notifications,
        IDateTimeProvider dateTimeProvider,
        IQuizOverdueAttemptCloser overdueCloser)
    {
        _quizzes = quizzes;
        _reviews = reviews;
        _attempts = attempts;
        _assignments = assignments;
        _lookups = lookups;
        _studentScope = studentScope;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _notifications = notifications;
        _dateTimeProvider = dateTimeProvider;
        _overdueCloser = overdueCloser;
    }

    public async Task<PendingReviewListResponse> ListPendingAsync(CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        var (studentIds, assignedByUserId) = await QuizScopeResolver.ResolveAssignmentViewFilterAsync(
            _studentScope,
            scope,
            cancellationToken);
        var items = await _reviews.ListPendingReviewsAsync(
            studentIds,
            assignedByUserId,
            cancellationToken);

        return new PendingReviewListResponse(items
            .Where(item => QuizReviewAuthorizationRules.CanScore(scope.Role, item.AssignedByRole))
            .Select(item => new PendingReviewItemResponse(
            item.QuizId,
            item.QuizTitle,
            item.AttemptId,
            item.StudentId,
            item.StudentName,
            item.AttemptNumber,
            item.SubmittedAt,
            item.TotalMarks,
            item.ObtainedMarks,
            true)).ToArray());
    }

    public async Task<AttemptReviewResponse> GetReviewDetailAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken)
    {
        await _overdueCloser.CloseOverdueInProgressAttemptsAsync(
            _dateTimeProvider.UtcNow,
            cancellationToken);
        var (scope, assignment) = await EnsureReviewViewAccessAsync(quizId, attemptId, cancellationToken);
        var detail = await _reviews.GetAttemptReviewDetailAsync(quizId, attemptId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        return QuizReviewMapping.ToReviewResponse(
            detail,
            QuizReviewAuthorizationRules.CanScore(scope.Role, assignment.AssignedByRole),
            assignment.AssignedByRole);
    }

    public async Task<AttemptReviewResponse> MarkAnswersAsync(
        long quizId,
        long attemptId,
        MarkAttemptAnswersRequest request,
        CancellationToken cancellationToken)
    {
        var (scope, assignment) = await EnsureReviewScoreAccessAsync(quizId, attemptId, cancellationToken);
        if (assignment.IsReviewDone)
        {
            throw new BusinessRuleException("This quiz result is completed and cannot be changed.");
        }

        var reviewDetail = await _reviews.GetAttemptReviewDetailAsync(quizId, attemptId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        var questionMap = reviewDetail.Questions.ToDictionary(question => question.QuestionId);

        foreach (var markRequest in request.Answers)
        {
            if (!questionMap.TryGetValue(markRequest.QuestionId, out var reviewQuestion))
            {
                throw new ValidationAppException([$"Question {markRequest.QuestionId} was not found on this attempt."]);
            }

            if (markRequest.AwardedMarks < 0 || markRequest.AwardedMarks > reviewQuestion.MaxMarks)
            {
                throw new ValidationAppException([
                    $"Awarded marks for question {markRequest.QuestionId} must be between 0 and {reviewQuestion.MaxMarks}."
                ]);
            }

            var attemptQuestion = await _attempts.GetAttemptQuestionEntityAsync(attemptId, markRequest.QuestionId, cancellationToken)
                ?? throw new NotFoundAppException("Attempt question was not found.");

            var answer = await _attempts.GetAttemptAnswerEntityAsync(attemptQuestion.Id, cancellationToken);
            if (answer is not null)
            {
                var isCorrect = markRequest.AwardedMarks == reviewQuestion.MaxMarks && reviewQuestion.MaxMarks > 0;
                answer.Mark(markRequest.AwardedMarks, isCorrect);
            }

            if (reviewQuestion.RequiresReview)
            {
                await UpsertReviewFeedbackAsync(
                    scope,
                    attemptQuestion,
                    markRequest.Feedback ?? string.Empty,
                    cancellationToken);
            }
            else if (markRequest.Feedback.HasTrimmedText())
            {
                await UpsertReviewFeedbackAsync(
                    scope,
                    attemptQuestion,
                    markRequest.Feedback,
                    cancellationToken);
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var updated = await _reviews.GetAttemptReviewDetailAsync(quizId, attemptId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        return QuizReviewMapping.ToReviewResponse(updated, canScore: true, assignment.AssignedByRole);
    }

    public async Task<FinalizeReviewResponse> FinalizeAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken)
    {
        var (_, assignment) = await EnsureReviewScoreAccessAsync(quizId, attemptId, cancellationToken);
        if (assignment.IsReviewDone)
        {
            throw new BusinessRuleException("This attempt review has already been finalized.");
        }

        var attempt = await _attempts.GetAttemptEntityByIdAsync(attemptId, quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        if (!IsClosedAttemptForReview(attempt.StatusId)
            && !await _attempts.IsSubmittedAttemptAsync(attemptId, cancellationToken))
        {
            throw new BusinessRuleException("Only submitted attempts can be reviewed.");
        }

        var reviewDetail = await _reviews.GetAttemptReviewDetailAsync(quizId, attemptId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        var unreviewedSubjective = reviewDetail.Questions
            .Where(question => question.RequiresReview && question.SubmittedText.HasTrimmedText())
            .Any(question =>
                question.QuizReviewId is null || !question.HasHumanReviewFeedback);

        if (unreviewedSubjective)
        {
            throw new BusinessRuleException("Mark all subjective answers before finalizing review.");
        }

        var obtainedMarks = (short)reviewDetail.Questions.Sum(question => question.AwardedMarks);
        var reviewedStatusId = await _lookups.ResolveLookupIdByNamesAsync(
            "QuizAttemptStatus",
            LookupNames.ReviewedAttemptStatusNames,
            fallback: attempt.StatusId,
            cancellationToken);

        attempt.ApplyReviewedScore(obtainedMarks, reviewDetail.TotalMarks, reviewedStatusId);
        assignment.MarkReviewDone();

        var completedResultId = await _lookups.ResolveLookupIdAsync(
            LookupNames.QuizResultStatus,
            "Completed",
            fallback: LookupNames.QuizResultStatusIds.Completed,
            cancellationToken);
        assignment.SetResultStatus(completedResultId);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken);
        await _notifications.CreateAsync(
            [attempt.StudentId],
            "Quiz review complete",
            $"Your results for \"{quiz?.QuizTitle ?? "Quiz"}\" are ready.",
            QuizNotificationCategories.QuizReviewed,
            cancellationToken);

        return new FinalizeReviewResponse(
            attemptId,
            quizId,
            reviewDetail.TotalMarks,
            obtainedMarks,
            attempt.Percentage,
            true,
            "Reviewed");
    }

    private static bool IsClosedAttemptForReview(short statusId)
        => statusId is LookupNames.QuizAttemptStatusIds.Submitted
            or LookupNames.QuizAttemptStatusIds.AutoSubmitted
            or LookupNames.QuizAttemptStatusIds.Expired
            or LookupNames.QuizAttemptStatusIds.Reviewed;

    private async Task<(QuizManageScope Scope, QuizAssignment Assignment)> EnsureReviewViewAccessAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");

        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        QuizScopeResolver.EnsureCanViewQuiz(
            quiz,
            scope,
            LookupNames.IsDraftLifecycleName(lifecycleName));

        var attempt = await _attempts.GetAttemptEntityByIdAsync(attemptId, quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        var assignment = await _assignments.GetAssignmentEntityAsync(quizId, attempt.StudentId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz assignment was not found.");

        await QuizScopeResolver.EnsureCanViewAssignedStudentAsync(
            _studentScope,
            scope,
            attempt.StudentId,
            assignment.AssignedById,
            cancellationToken);

        return (scope, assignment);
    }

    private async Task<(QuizManageScope Scope, QuizAssignment Assignment)> EnsureReviewScoreAccessAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken)
    {
        var (scope, assignment) = await EnsureReviewViewAccessAsync(quizId, attemptId, cancellationToken);
        if (!QuizReviewAuthorizationRules.CanScore(scope.Role, assignment.AssignedByRole))
        {
            throw new ForbiddenAppException(
                QuizReviewAuthorizationRules.DescribeScoreDenial(assignment.AssignedByRole));
        }

        return (scope, assignment);
    }

    private async Task UpsertReviewFeedbackAsync(
        QuizManageScope scope,
        QuizAttemptQuestion attemptQuestion,
        string feedback,
        CancellationToken cancellationToken)
    {
        if (attemptQuestion.QuizReviewId is not null)
        {
            var existingReview = await _reviews.GetQuestionReviewEntityAsync(attemptQuestion.QuizReviewId.Value, cancellationToken);
            if (existingReview is not null)
            {
                if (scope.Role is UserRole.Teacher or UserRole.Coordinator)
                {
                    existingReview.SetTeacherReview(null, feedback);
                }
                else
                {
                    existingReview.SetParentReview(null, feedback);
                }

                return;
            }
        }

        var review = new QuizReview(scope.UserId.ToString(), quizId: null, questionId: attemptQuestion.QuestionId);
        if (scope.Role is UserRole.Teacher or UserRole.Coordinator)
        {
            review.SetTeacherReview(null, feedback);
        }
        else
        {
            review.SetParentReview(null, feedback);
        }

        await _reviews.AddReviewAsync(review, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        attemptQuestion.LinkReview(review.Id);
    }
}
