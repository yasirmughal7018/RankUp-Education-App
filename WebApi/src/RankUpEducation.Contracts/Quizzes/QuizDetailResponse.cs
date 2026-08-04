namespace RankUpEducation.Contracts.Quizzes;

/// <summary>Quiz detail with attempt rules, shuffle flags, and result summary for the current viewer.</summary>
public sealed record QuizDetailResponse(
    long Id,
    string Title,
    string Description,
    string Subject,
    string Grade,
    string Topic,
    string QuizType,
    string Difficulty,
    short QuestionCount,
    short TotalMarks,
    short? TimeLimitMinutes,
    short AttemptLimit,
    short AttemptsUsed,
    DateTimeOffset? StartAt,
    DateTimeOffset? DueAt,
    string Status,
    IReadOnlyList<string> Instructions,
    bool ShuffleQuestions,
    bool ShuffleOptions,
    bool HintsAllowed,
    bool ReviewAvailable,
    string CreatedBy,
    string SchoolName,
    string ResultStatus,
    short? ResultPercent);
