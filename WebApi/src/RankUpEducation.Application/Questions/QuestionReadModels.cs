using RankUpEducation.Application.Quizzes;

namespace RankUpEducation.Application.Questions;

public sealed record QuestionListItem(
    long QuestionId,
    string QuestionText,
    string QuestionTypeName,
    string StatusName,
    short ClassId,
    short SubjectId,
    short DifficultyLevel,
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
    string? RejectionReason,
    DateOnly CreatedDate,
    DateOnly ModifiedDate,
    IReadOnlyList<QuizQuestionOptionItem> Options,
    IReadOnlyList<QuestionAcceptedAnswerItem> AcceptedAnswers);

public sealed record QuestionAcceptedAnswerItem(
    long AcceptedAnswerId,
    string AnswerText,
    bool IsCaseSensitive,
    bool AllowPartialMatch,
    string NormalizedAnswer,
    short MinimumLength,
    short MaximumLength,
    bool AllowAiReview,
    bool AllowTeacherReview);
