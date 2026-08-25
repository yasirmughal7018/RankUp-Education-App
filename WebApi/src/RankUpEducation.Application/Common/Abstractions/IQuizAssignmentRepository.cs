using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Common.Abstractions;

public interface IQuizAssignmentRepository
{
    Task AddAssignmentsAsync(IReadOnlyList<QuizAssignment> assignments, CancellationToken cancellationToken);

    Task<IReadOnlyList<QuizAssignmentListItem>> ListAssignmentsForQuizAsync(
        long quizId,
        IReadOnlyList<long>? studentIds,
        long? assignedByUserId,
        CancellationToken cancellationToken);

    Task<int> RemoveFutureAssignmentsAsync(
        long quizId,
        DateTimeOffset now,
        long assignedByUserId,
        CancellationToken cancellationToken);

    Task<bool> AssignmentExistsAsync(long quizId, long studentId, CancellationToken cancellationToken);

    Task<IReadOnlyList<QuizAssignment>> GetAssignmentEntitiesForStudentsAsync(
        long quizId,
        IReadOnlyList<long> studentIds,
        CancellationToken cancellationToken);

    /// <summary>
    /// Cross-quiz assignment board scoped to the caller's students.
    /// <paramref name="studentIds"/> null is unrestricted (PortalAdmin).
    /// </summary>
    Task<IReadOnlyList<QuizAssignmentBoardItem>> ListAssignmentBoardAsync(
        IReadOnlyList<long>? studentIds,
        long? assignedByUserId,
        long? studentId,
        CancellationToken cancellationToken);

    Task<QuizAssignmentAccess?> GetAssignmentAccessAsync(
        long quizId,
        long studentId,
        CancellationToken cancellationToken);

    Task<QuizAssignment?> GetAssignmentEntityAsync(long quizId, long studentId, CancellationToken cancellationToken);

    Task<QuizAssignment?> GetAssignmentEntityByIdAsync(
        long assignmentId,
        long quizId,
        CancellationToken cancellationToken);

    Task<QuizAssignmentReviewState?> GetAssignmentReviewStateAsync(
        long quizId,
        long studentId,
        CancellationToken cancellationToken);

    /// <summary>
    /// Promotes due Upcoming assignments to Not Attempted, expires unattempted past-window
    /// assignments, and marks overdue in-progress attempts as Expired (84).
    /// Newly opened Surprise rows are returned so callers can notify students without advance notice.
    /// </summary>
    Task<QuizAssignmentLifecycleMaintenanceResult> ExpireOverdueUnattemptedAsync(
        DateTimeOffset now,
        CancellationToken cancellationToken);
}
