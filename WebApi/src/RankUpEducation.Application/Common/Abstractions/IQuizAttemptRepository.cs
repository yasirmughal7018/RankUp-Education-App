using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Common.Abstractions;

public interface IQuizAttemptRepository
{
    Task AddAttemptAsync(QuizAttempt attempt, CancellationToken cancellationToken);

    Task AddAttemptQuestionsAsync(IReadOnlyList<QuizAttemptQuestion> attemptQuestions, CancellationToken cancellationToken);

    Task AddAttemptAnswersAsync(IReadOnlyList<QuizAttemptAnswer> answers, CancellationToken cancellationToken);

    Task<QuizAttempt?> GetInProgressAttemptAsync(
        long quizId,
        long studentId,
        short inProgressStatusId,
        CancellationToken cancellationToken);

    Task<QuizAttemptDetailItem?> GetAttemptDetailAsync(long attemptId, long studentId, CancellationToken cancellationToken);

    Task<QuizAttempt?> GetAttemptEntityAsync(long attemptId, long studentId, CancellationToken cancellationToken);

    Task<int> CountAttemptsAsync(long quizId, long studentId, CancellationToken cancellationToken);

    Task<QuizAttempt?> GetAttemptEntityByIdAsync(long attemptId, long quizId, CancellationToken cancellationToken);

    Task<QuizAttemptQuestion?> GetAttemptQuestionEntityAsync(
        long attemptId,
        long questionId,
        CancellationToken cancellationToken);

    Task<QuizAttemptAnswer?> GetAttemptAnswerEntityAsync(long attemptQuestionId, CancellationToken cancellationToken);

    Task<IReadOnlyList<QuizAttemptAnswer>> GetAttemptAnswerEntitiesAsync(
        long attemptQuestionId,
        CancellationToken cancellationToken);

    Task RemoveAttemptAnswersAsync(long attemptQuestionId, CancellationToken cancellationToken);

    Task<bool> IsSubmittedAttemptAsync(long attemptId, CancellationToken cancellationToken);
}
