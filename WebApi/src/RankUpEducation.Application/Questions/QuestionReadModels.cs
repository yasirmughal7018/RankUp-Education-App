using RankUpEducation.Application.Quizzes;

namespace RankUpEducation.Application.Questions;

public sealed record QuestionListItem(
    long QuestionId,
    string QuestionText,
    string QuestionTypeName,
    string StatusName,
    short Marks,
    bool IsActive,
    string CreatedBy,
    string? ApprovedBy,
    bool IsAiApproved,
    DateOnly CreatedDate,
    DateOnly ModifiedDate);

public sealed record QuestionDetailItem(
    long QuestionId,
    string QuestionText,
    short QuestionTypeId,
    string QuestionTypeName,
    short ClassId,
    short SubjectId,
    short? TopicId,
    short DifficultyLevel,
    short StatusId,
    string StatusName,
    short Marks,
    short EstimatedTimeSeconds,
    string? Hint,
    string? Explanation,
    bool IsActive,
    string CreatedBy,
    string? ApprovedBy,
    bool IsAiApproved,
    DateOnly CreatedDate,
    DateOnly ModifiedDate,
    IReadOnlyList<QuizQuestionOptionItem> Options);
