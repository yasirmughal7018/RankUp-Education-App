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
    DateTimeOffset? LastSubmittedAt,
    string? LifecycleStatusName = null);

public sealed record PendingQuizApprovalItem(
    long QuizId,
    string Title,
    string CreatedBy,
    string SchoolName,
    string SubjectName,
    string GradeName,
    string QuizTypeName,
    string ApprovalStatus,
    string LifecycleStatus,
    short TotalQuestions,
    DateOnly ModifiedDate);

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
    DateTimeOffset? LastSubmittedAt,
    short ClassId,
    short SubjectId,
    short TopicId,
    short DifficultyLevelId,
    short LifecycleStatusId,
    string LifecycleStatusName);

public sealed record StudentSchoolContext(
    int SchoolId,
    int CampusId,
    short Grade);

public sealed record QuizAssignmentListItem(
    long AssignmentId,
    long StudentId,
    string StudentName,
    long? StudentGroupId,
    DateTimeOffset StartDateTime,
    DateTimeOffset EndDateTime,
    short AllowedAttempts,
    short QuizResultStatusId,
    string QuizResultStatusName,
    bool IsReviewDone,
    int AttemptCount);

public sealed record QuizQuestionItem(
    long QuestionId,
    string QuestionText,
    short QuestionTypeId,
    string QuestionTypeName,
    short Marks,
    short DisplayOrder,
    string? Hint,
    IReadOnlyList<QuizQuestionOptionItem> Options,
    IReadOnlyList<QuestionAcceptedAnswerScoreItem> AcceptedAnswers);

/// <summary>Server-side Fill scoring model — never returned on student attempt start.</summary>
public sealed record QuestionAcceptedAnswerScoreItem(
    long AcceptedAnswerId,
    string AnswerText,
    bool IsCaseSensitive,
    bool AllowPartialMatch,
    string NormalizedAnswer,
    short MinimumLength,
    short MaximumLength);

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
    IReadOnlyList<QuizQuestionOptionItem> Options,
    IReadOnlyList<long> SelectedOptionIds);

public sealed record QuizAssignmentAccess(
    long AssignmentId,
    long QuizId,
    long StudentId,
    DateTimeOffset StartDateTime,
    DateTimeOffset EndDateTime,
    short AllowedAttempts,
    int ExistingAttemptCount);

public sealed record QuizAssignmentBoardItem(
    long AssignmentId,
    long QuizId,
    string QuizTitle,
    long StudentId,
    string StudentName,
    DateTimeOffset StartDateTime,
    DateTimeOffset EndDateTime,
    short AllowedAttempts,
    int AttemptCount,
    bool IsReviewDone,
    string ResultStatusName,
    DateTimeOffset? LastSubmittedAt);

public sealed record QuizMonitoringStudentItem(
    long StudentId,
    string StudentName,
    long AssignmentId,
    int AttemptCount,
    short? BestPercentage,
    bool IsReviewDone,
    DateTimeOffset? LastSubmittedAt,
    DateTimeOffset StartDateTime,
    DateTimeOffset EndDateTime);

public sealed record PendingReviewItem(
    long QuizId,
    string QuizTitle,
    long AttemptId,
    long StudentId,
    string StudentName,
    short AttemptNumber,
    DateTimeOffset SubmittedAt,
    short TotalMarks,
    short ObtainedMarks);

public sealed record AttemptReviewDetailItem(
    long AttemptId,
    long QuizId,
    string QuizTitle,
    long StudentId,
    string StudentName,
    short AttemptNumber,
    short TotalMarks,
    short ObtainedMarks,
    short Percentage,
    string StatusName,
    bool IsReviewDone,
    DateTimeOffset SubmittedAt,
    IReadOnlyList<AttemptReviewQuestionItem> Questions);

public sealed record AttemptReviewQuestionItem(
    long AttemptQuestionId,
    long QuestionId,
    string QuestionText,
    string QuestionTypeName,
    short MaxMarks,
    short AwardedMarks,
    bool IsCorrect,
    long? SelectedOptionId,
    string? SubmittedText,
    string? ParentFeedback,
    bool RequiresReview,
    long? QuizReviewId,
    IReadOnlyList<long> SelectedOptionIds);

public sealed record QuizQuestionCopyItem(
    long QuestionId,
    string QuestionText,
    short QuestionTypeId,
    short ClassId,
    short SubjectId,
    short? TopicId,
    short DifficultyLevel,
    short EstimatedTimeSeconds,
    short Marks,
    string? Hint,
    string? Explanation,
    short DisplayOrder,
    IReadOnlyList<QuizQuestionOptionItem> Options,
    IReadOnlyList<QuestionAcceptedAnswerScoreItem> AcceptedAnswers);

public sealed record QuizAssignmentReviewState(
    long AssignmentId,
    bool IsReviewDone,
    bool IsReviewRequired);
