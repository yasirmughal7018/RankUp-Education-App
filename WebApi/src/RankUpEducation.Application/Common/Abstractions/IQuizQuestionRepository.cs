using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Common.Abstractions;

public interface IQuizQuestionRepository
{
    Task<IReadOnlyList<QuizQuestionItem>> GetQuizQuestionsAsync(
        long quizId,
        CancellationToken cancellationToken,
        bool includeInactive = false);

    Task AddQuizQuestionAsync(QuizQuestion quizQuestion, CancellationToken cancellationToken);

    Task<QuizQuestion?> GetQuizQuestionLinkAsync(long quizId, long questionId, CancellationToken cancellationToken);

    Task RemoveQuizQuestionLinkAsync(QuizQuestion link, CancellationToken cancellationToken);

    /// <summary>
    /// Recalculates quiz TotalQuestions, TotalMarks, and TimeLimitMinutes
    /// (ceil of Σ quiz_questions.time_in_sec / 60) after question set changes.
    /// </summary>
    Task RecalculateQuizTotalsAsync(long quizId, CancellationToken cancellationToken);

    Task<IReadOnlyList<QuizQuestionCopyItem>> GetQuizQuestionsForCopyAsync(
        long quizId,
        CancellationToken cancellationToken);
}
