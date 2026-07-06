using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Common.Abstractions;

public interface IQuizRepository
{
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

    Task<QuizDetailItem?> GetDetailForStudentAsync(long quizId, long studentId, CancellationToken cancellationToken);

    Task<QuizAssignmentAccess?> GetAssignmentAccessAsync(
        long quizId,
        long studentId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<QuizQuestionItem>> GetQuizQuestionsAsync(long quizId, CancellationToken cancellationToken);

    Task AddAttemptAsync(QuizAttempt attempt, CancellationToken cancellationToken);

    Task AddAttemptQuestionsAsync(IReadOnlyList<QuizAttemptQuestion> attemptQuestions, CancellationToken cancellationToken);

    Task AddAttemptAnswersAsync(IReadOnlyList<QuizAttemptAnswer> answers, CancellationToken cancellationToken);

    Task<QuizAttemptDetailItem?> GetAttemptDetailAsync(long attemptId, long studentId, CancellationToken cancellationToken);

    Task<QuizAttempt?> GetAttemptEntityAsync(long attemptId, long studentId, CancellationToken cancellationToken);

    Task<IReadOnlyList<long>> GetLinkedStudentIdsAsync(long parentId, CancellationToken cancellationToken);

    Task<short> ResolveLookupIdAsync(string type, string name, short fallback, CancellationToken cancellationToken);

    Task<string> GetLookupNameAsync(short id, CancellationToken cancellationToken);

    Task<int> CountAttemptsAsync(long quizId, long studentId, CancellationToken cancellationToken);
}
