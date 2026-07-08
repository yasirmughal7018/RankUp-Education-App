using RankUpEducation.Application.Quizzes;
using RankUpEducation.Contracts.Questions;

namespace RankUpEducation.Application.Questions;

internal static class QuestionMapping
{
    public static QuestionSummaryResponse ToSummaryResponse(QuestionListItem item)
        => new(
            item.QuestionId,
            item.QuestionText,
            item.QuestionTypeName,
            item.StatusName,
            item.Marks,
            item.IsActive,
            item.CreatedBy,
            item.ApprovedBy,
            item.IsAiApproved,
            item.CreatedDate,
            item.ModifiedDate);

    public static QuestionDetailResponse ToDetailResponse(QuestionDetailItem item)
        => new(
            item.QuestionId,
            item.QuestionText,
            item.QuestionTypeName,
            item.ClassId,
            item.SubjectId,
            item.TopicId,
            item.DifficultyLevel,
            item.StatusName,
            item.Marks,
            item.EstimatedTimeSeconds,
            item.Hint,
            item.Explanation,
            item.IsActive,
            item.CreatedBy,
            item.ApprovedBy,
            item.IsAiApproved,
            item.CreatedDate,
            item.ModifiedDate,
            item.Options.Select(option => new QuestionOptionResponse(
                option.OptionId,
                option.OptionText,
                option.IsCorrect)).ToArray());
}
