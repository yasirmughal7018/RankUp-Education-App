using RankUpEducation.Application.Questions;
using RankUpEducation.Domain.Questions;

namespace RankUpEducation.Application.Common.Abstractions;

/// <summary>
/// Persistence for the question bank: CRUD, list filtering by org visibility, and answer children.
/// </summary>
public interface IQuestionRepository
{
    Task AddQuestionAsync(Question question, CancellationToken cancellationToken);

    /// <summary>Active-only entity load (legacy callers).</summary>
    Task<Question?> GetQuestionEntityAsync(long questionId, CancellationToken cancellationToken);

    /// <summary>Manage load including inactive / pending (with options).</summary>
    Task<Question?> GetQuestionEntityForManageAsync(long questionId, CancellationToken cancellationToken);

    /// <summary>
    /// Lists bank questions with optional filters.
    /// When <paramref name="visibilityScope"/> is set (non–PortalAdmin): own rows plus Approved
    /// rows matching Public / School / Campus rules; pending queues are org-scoped.
    /// </summary>
    Task<IReadOnlyList<QuestionListItem>> ListQuestionsAsync(
        long? createdByUserId,
        bool? isActive,
        short? subjectId,
        short? classId,
        bool pendingApprovalOnly,
        bool eligibleForQuizOnly,
        QuestionListVisibilityScope? visibilityScope,
        CancellationToken cancellationToken);

    Task<QuestionDetailItem?> GetQuestionDetailAsync(long questionId, CancellationToken cancellationToken);

    Task<int> CountQuizLinksAsync(long questionId, CancellationToken cancellationToken);

    Task RemoveAllQuizLinksForQuestionAsync(long questionId, CancellationToken cancellationToken);

    Task DeleteQuestionAsync(Question question, CancellationToken cancellationToken);

    Task RemoveQuestionOptionsAsync(long questionId, CancellationToken cancellationToken);

    Task AddQuestionOptionsAsync(IReadOnlyList<QuestionOption> options, CancellationToken cancellationToken);

    Task RemoveQuestionAcceptedAnswersAsync(long questionId, CancellationToken cancellationToken);

    Task AddQuestionAcceptedAnswersAsync(
        IReadOnlyList<QuestionAcceptedAnswer> answers,
        CancellationToken cancellationToken);
}
