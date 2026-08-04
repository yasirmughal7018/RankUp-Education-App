namespace RankUpEducation.Contracts.Quizzes;

/// <summary>Quiz card for list views (student assignments, teacher campus, parent linked/created).</summary>
public sealed record QuizSummaryResponse(
    long Id,
    string Title,
    string Subject,
    string Grade,
    short QuestionCount,
    short Points,
    string Status,
    string Description,
    string QuizType,
    string Topic,
    string Difficulty,
    short TotalMarks,
    short? TimeLimitMinutes,
    short AttemptLimit,
    DateTimeOffset? StartAt,
    DateTimeOffset? DueAt,
    DateTimeOffset? CompletedAt,
    IReadOnlyList<string> Instructions,
    bool ReviewAvailable,
    string ResultStatus,
    short? ResultPercent,
    string CreatedBy,
    string SchoolName);

public sealed record QuizListResponse(IReadOnlyList<QuizSummaryResponse> Items);
