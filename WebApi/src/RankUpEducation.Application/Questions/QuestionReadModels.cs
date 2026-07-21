using RankUpEducation.Application.Quizzes;

namespace RankUpEducation.Application.Questions;

/// <summary>Projection row for question-bank list endpoints (includes org + visibility).</summary>
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
    int? SchoolId,
    int? CampusId,
    short VisibilityLevel,
    string Visibility,
    DateOnly CreatedDate,
    DateOnly ModifiedDate);

/// <summary>Full question projection for detail / create / update responses.</summary>
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
    int? SchoolId,
    int? CampusId,
    short VisibilityLevel,
    string Visibility,
    DateOnly CreatedDate,
    DateOnly ModifiedDate,
    IReadOnlyList<QuizQuestionOptionItem> Options,
    IReadOnlyList<QuestionAcceptedAnswerItem> AcceptedAnswers);

/// <summary>Fill-in-the-Blank accepted-answer projection.</summary>
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

/// <summary>
/// Org-aware bank visibility for non–PortalAdmin list queries.
/// Null filter means no visibility restriction (PortalAdmin / raw pending queue).
/// Own rows always included; Approved rows filtered by Public / School / Campus (+ SchoolAdmin campus widen).
/// </summary>
public sealed record QuestionListVisibilityScope(
    long UserId,
    int? SchoolId,
    int? CampusId,
    bool IsSchoolAdmin);
