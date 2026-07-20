using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Common.Utilities;
using RankUpEducation.Contracts.Quizzes;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Quizzes;

public interface IQuizReviewService
{
    Task<PendingReviewListResponse> ListPendingAsync(CancellationToken cancellationToken);

    Task<AttemptReviewResponse> GetReviewDetailAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken);

    Task<AttemptReviewResponse> MarkAnswersAsync(
        long quizId,
        long attemptId,
        MarkAttemptAnswersRequest request,
        CancellationToken cancellationToken);

    Task<FinalizeReviewResponse> FinalizeAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken);
}

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

    public QuizReviewService(
        IQuizRepository quizzes,
        IQuizReviewRepository reviews,
        IQuizAttemptRepository attempts,
        IQuizAssignmentRepository assignments,
        ILookupRepository lookups,
        IStudentScopeRepository studentScope,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser)
    {
        _quizzes = quizzes;
        _reviews = reviews;
        _attempts = attempts;
        _assignments = assignments;
        _lookups = lookups;
        _studentScope = studentScope;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
    }

    public async Task<PendingReviewListResponse> ListPendingAsync(CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        var items = await _reviews.ListPendingReviewsForCreatorAsync(scope.UserId, cancellationToken);

        return new PendingReviewListResponse(items.Select(item => new PendingReviewItemResponse(
            item.QuizId,
            item.QuizTitle,
            item.AttemptId,
            item.StudentId,
            item.StudentName,
            item.AttemptNumber,
            item.SubmittedAt,
            item.TotalMarks,
            item.ObtainedMarks)).ToArray());
    }

    public async Task<AttemptReviewResponse> GetReviewDetailAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken)
    {
        await EnsureReviewAccessAsync(quizId, attemptId, cancellationToken);
        var detail = await _reviews.GetAttemptReviewDetailAsync(quizId, attemptId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        return QuizReviewMapping.ToReviewResponse(detail);
    }

    public async Task<AttemptReviewResponse> MarkAnswersAsync(
        long quizId,
        long attemptId,
        MarkAttemptAnswersRequest request,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        await EnsureReviewAccessAsync(quizId, attemptId, cancellationToken);

        var assignment = await RequireAssignmentAsync(quizId, attemptId, cancellationToken);
        if (assignment.IsReviewDone)
        {
            throw new BusinessRuleException("This attempt review has already been finalized.");
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

        return QuizReviewMapping.ToReviewResponse(updated);
    }

    public async Task<FinalizeReviewResponse> FinalizeAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        await EnsureReviewAccessAsync(quizId, attemptId, cancellationToken);

        var assignment = await RequireAssignmentAsync(quizId, attemptId, cancellationToken);
        if (assignment.IsReviewDone)
        {
            throw new BusinessRuleException("This attempt review has already been finalized.");
        }

        var attempt = await _attempts.GetAttemptEntityByIdAsync(attemptId, quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        if (!await _attempts.IsSubmittedAttemptAsync(attemptId, cancellationToken))
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
            QuizLookupNames.ReviewedAttemptStatusNames,
            fallback: attempt.StatusId,
            cancellationToken);

        attempt.ApplyReviewedScore(obtainedMarks, reviewDetail.TotalMarks, reviewedStatusId);
        assignment.MarkReviewDone();

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new FinalizeReviewResponse(
            attemptId,
            quizId,
            reviewDetail.TotalMarks,
            obtainedMarks,
            attempt.Percentage,
            true,
            "Reviewed");
    }

    private async Task EnsureReviewAccessAsync(long quizId, long attemptId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");

        QuizScopeResolver.EnsureOwnsQuiz(quiz, scope);

        var attempt = await _attempts.GetAttemptEntityByIdAsync(attemptId, quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        await QuizScopeResolver.EnsureCanAccessStudentAsync(
            _studentScope,
            scope,
            attempt.StudentId,
            cancellationToken);
    }

    private async Task<QuizAssignment> RequireAssignmentAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken)
    {
        var attempt = await _attempts.GetAttemptEntityByIdAsync(attemptId, quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        return await _assignments.GetAssignmentEntityAsync(quizId, attempt.StudentId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz assignment was not found.");
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
                if (scope.Role == UserRole.Teacher)
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
        if (scope.Role == UserRole.Teacher)
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
