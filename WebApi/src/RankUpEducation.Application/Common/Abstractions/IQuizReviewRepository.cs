using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Common.Abstractions;

public interface IQuizReviewRepository
{
    /// <summary>Per-student monitoring rows for a quiz (authorization is enforced by the caller).</summary>
    Task<IReadOnlyList<QuizMonitoringStudentItem>> ListMonitoringForQuizAsync(
        long quizId,
        CancellationToken cancellationToken);

    /// <summary>
    /// Pending subjective reviews. Pass creatorUserId for Teacher/Parent ownership,
    /// schoolId for SchoolAdmin, or neither for PortalAdmin (platform-wide).
    /// </summary>
    Task<IReadOnlyList<PendingReviewItem>> ListPendingReviewsAsync(
        long? creatorUserId,
        int? schoolId,
        CancellationToken cancellationToken);

    Task<AttemptReviewDetailItem?> GetAttemptReviewDetailAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken);

    Task<QuizReview?> GetQuestionReviewEntityAsync(long reviewId, CancellationToken cancellationToken);

    Task AddReviewAsync(QuizReview review, CancellationToken cancellationToken);
}
