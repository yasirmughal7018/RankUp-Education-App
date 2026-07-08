using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Common.Abstractions;

public interface IQuizReviewRepository
{
    Task<IReadOnlyList<QuizMonitoringStudentItem>> ListMonitoringForQuizAsync(
        long quizId,
        long creatorUserId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<PendingReviewItem>> ListPendingReviewsForCreatorAsync(
        long creatorUserId,
        CancellationToken cancellationToken);

    Task<AttemptReviewDetailItem?> GetAttemptReviewDetailAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken);

    Task<QuizReview?> GetQuestionReviewEntityAsync(long reviewId, CancellationToken cancellationToken);

    Task AddReviewAsync(QuizReview review, CancellationToken cancellationToken);
}
