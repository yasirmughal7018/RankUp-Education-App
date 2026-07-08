using RankUpEducation.Application.Questions;
using RankUpEducation.Domain.Questions;

namespace RankUpEducation.Application.Common.Abstractions;

public interface IQuestionRepository
{
    Task AddQuestionAsync(Question question, CancellationToken cancellationToken);

    Task<Question?> GetQuestionEntityAsync(long questionId, CancellationToken cancellationToken);

    Task<Question?> GetQuestionEntityForManageAsync(long questionId, CancellationToken cancellationToken);

    Task<IReadOnlyList<QuestionListItem>> ListQuestionsAsync(
        long? createdByUserId,
        bool? isActive,
        short? subjectId,
        short? classId,
        bool pendingApprovalOnly,
        CancellationToken cancellationToken);

    Task<QuestionDetailItem?> GetQuestionDetailAsync(long questionId, CancellationToken cancellationToken);

    Task<int> CountQuizLinksAsync(long questionId, CancellationToken cancellationToken);

    Task RemoveAllQuizLinksForQuestionAsync(long questionId, CancellationToken cancellationToken);

    Task DeleteQuestionAsync(Question question, CancellationToken cancellationToken);

    Task RemoveQuestionOptionsAsync(long questionId, CancellationToken cancellationToken);

    Task AddQuestionOptionsAsync(IReadOnlyList<QuestionOption> options, CancellationToken cancellationToken);
}
