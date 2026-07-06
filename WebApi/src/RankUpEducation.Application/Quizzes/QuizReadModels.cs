namespace RankUpEducation.Application.Quizzes;

public sealed record QuizListItem(
    long QuizId,
    long? AssignmentId,
    string QuizTitle,
    string Description,
    short TotalQuestions,
    short? TotalMarks,
    short? TimeLimitMinutes,
    short AllowedAttempts,
    DateTimeOffset? StartDateTime,
    DateTimeOffset? EndDateTime,
    string CreatedByName,
    string SchoolName,
    string SubjectName,
    string GradeName,
    string TopicName,
    string QuizTypeName,
    string DifficultyName,
    string Instructions,
    bool IsReviewRequired,
    int AttemptCount,
    short? BestPercentage,
    DateTimeOffset? LastSubmittedAt);

public sealed record QuizDetailItem(
    long QuizId,
    long? AssignmentId,
    string QuizTitle,
    string Description,
    short TotalQuestions,
    short? TotalMarks,
    short? TimeLimitMinutes,
    short AllowedAttempts,
    DateTimeOffset? StartDateTime,
    DateTimeOffset? EndDateTime,
    string CreatedByName,
    string SchoolName,
    string SubjectName,
    string GradeName,
    string TopicName,
    string QuizTypeName,
    string DifficultyName,
    string Instructions,
    bool ShuffleQuestions,
    bool ShuffleOptions,
    bool IsReviewRequired,
    int AttemptCount,
    short? BestPercentage,
    DateTimeOffset? LastSubmittedAt);

public sealed record QuizQuestionItem(
    long QuestionId,
    string QuestionText,
    short QuestionTypeId,
    string QuestionTypeName,
    short Marks,
    short DisplayOrder,
    string? Hint,
    IReadOnlyList<QuizQuestionOptionItem> Options);

public sealed record QuizQuestionOptionItem(
    long OptionId,
    string OptionText,
    string? OptionImageUrl,
    bool IsCorrect);

public sealed record QuizAttemptDetailItem(
    long AttemptId,
    long QuizId,
    long StudentId,
    short AttemptNumber,
    short StatusId,
    string StatusName,
    short TotalMarks,
    short ObtainedMarks,
    short Percentage,
    short TimeSpentSeconds,
    DateTimeOffset StartedAt,
    DateTimeOffset SubmittedAt,
    IReadOnlyList<QuizAttemptQuestionItem> Questions);

public sealed record QuizAttemptQuestionItem(
    long AttemptQuestionId,
    long QuestionId,
    string QuestionText,
    short Marks,
    short DisplayOrder,
    string? Explanation,
    long? SelectedOptionId,
    string? SubmittedText,
    short AwardedMarks,
    bool IsCorrect,
    IReadOnlyList<QuizQuestionOptionItem> Options);

public sealed record QuizAssignmentAccess(
    long AssignmentId,
    long QuizId,
    long StudentId,
    DateTimeOffset StartDateTime,
    DateTimeOffset EndDateTime,
    short AllowedAttempts,
    int ExistingAttemptCount);
