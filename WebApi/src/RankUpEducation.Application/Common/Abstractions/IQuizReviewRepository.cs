using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Common.Abstractions;

public interface IQuizReviewRepository
{
    /// <summary>Per-student monitoring rows for a quiz (authorization is enforced by the caller).</summary>
    Task<IReadOnlyList<QuizMonitoringStudentItem>> ListMonitoringForQuizAsync(
        long quizId,
        IReadOnlyList<long>? studentIds,
        long? assignedByUserId,
        CancellationToken cancellationToken);

    /// <summary>
    /// Pending subjective reviews for students in the caller's scope.
    /// <paramref name="studentIds"/> null is unrestricted (PortalAdmin).
    /// </summary>
    Task<IReadOnlyList<PendingReviewItem>> ListPendingReviewsAsync(
        IReadOnlyList<long>? studentIds,
        long? assignedByUserId,
        CancellationToken cancellationToken);

    Task<AttemptReviewDetailItem?> GetAttemptReviewDetailAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken);

    Task<QuizReview?> GetQuestionReviewEntityAsync(long reviewId, CancellationToken cancellationToken);

    Task AddReviewAsync(QuizReview review, CancellationToken cancellationToken);
}
