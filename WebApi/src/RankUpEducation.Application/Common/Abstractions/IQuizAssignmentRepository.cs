using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Common.Abstractions;

public interface IQuizAssignmentRepository
{
    Task AddAssignmentsAsync(IReadOnlyList<QuizAssignment> assignments, CancellationToken cancellationToken);

    Task<IReadOnlyList<QuizAssignmentListItem>> ListAssignmentsForQuizAsync(
        long quizId,
        CancellationToken cancellationToken);

    Task<int> RemoveFutureAssignmentsAsync(long quizId, DateTimeOffset now, CancellationToken cancellationToken);

    Task<bool> AssignmentExistsAsync(long quizId, long studentId, CancellationToken cancellationToken);

    /// <summary>
    /// Cross-quiz assignment board. Pass creatorUserId for Teacher/Parent ownership,
    /// schoolId for SchoolAdmin, campusId for CampusAdmin, or neither for PortalAdmin (platform-wide).
    /// </summary>
    Task<IReadOnlyList<QuizAssignmentBoardItem>> ListAssignmentBoardAsync(
        long? creatorUserId,
        int? schoolId,
        int? campusId,
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
