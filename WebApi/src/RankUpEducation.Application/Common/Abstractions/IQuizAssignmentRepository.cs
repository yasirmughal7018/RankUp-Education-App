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

    Task<IReadOnlyList<QuizAssignmentBoardItem>> ListAssignmentBoardForCreatorAsync(
        long creatorUserId,
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
}
