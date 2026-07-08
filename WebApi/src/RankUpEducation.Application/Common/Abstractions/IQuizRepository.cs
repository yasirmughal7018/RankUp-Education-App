using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Common.Abstractions;

public interface IQuizRepository
{
    Task AddQuizAsync(Quiz quiz, CancellationToken cancellationToken);

    Task<Quiz?> GetQuizEntityAsync(long quizId, CancellationToken cancellationToken);

    Task DeleteQuizAsync(Quiz quiz, CancellationToken cancellationToken);

    Task<IReadOnlyList<QuizListItem>> ListForStudentAsync(
        long studentId,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<QuizListItem>> ListForLinkedStudentsAsync(
        IReadOnlyList<long> studentIds,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<QuizListItem>> ListForTeacherAsync(
        long teacherUserId,
        int schoolId,
        int campusId,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<QuizListItem>> ListForSchoolAsync(
        int? schoolId,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<QuizListItem>> ListForCreatorAsync(
        long creatorUserId,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken);

    Task<QuizDetailItem?> GetDetailForStudentAsync(long quizId, long studentId, CancellationToken cancellationToken);

    Task<QuizDetailItem?> GetDetailForCreatorAsync(long quizId, long creatorUserId, CancellationToken cancellationToken);

    Task<bool> HasStartedAssignmentsAsync(long quizId, DateTimeOffset now, CancellationToken cancellationToken);

    Task<bool> HasAnyAssignmentsAsync(long quizId, CancellationToken cancellationToken);

    Task<bool> HasAnyAttemptsAsync(long quizId, CancellationToken cancellationToken);

    Task<bool> IsParentPrivateQuizTypeAsync(short quizTypeId, CancellationToken cancellationToken);
}
