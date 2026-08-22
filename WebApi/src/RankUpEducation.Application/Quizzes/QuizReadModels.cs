using RankUpEducation.Domain.Approvals;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Quizzes;

/// <summary>Repository projection and service-layer DTOs for quiz list, detail, attempt, assign, and review flows.</summary>
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
    string? LifecycleStatusName = null,
    string? QuizResultStatusName = null,
    string? ApprovalStatusName = null);

/// <summary>Quiz awaiting school-admin approval (Pending or Rejected).</summary>
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
    DateOnly ModifiedDate,
    string? RejectionReason = null);

/// <summary>Full quiz detail including shuffle/review flags and lifecycle ids for manage views.</summary>
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
    string NavigationMode,
    int AttemptCount,
    short? BestPercentage,
    DateTimeOffset? LastSubmittedAt,
    short ClassId,
    short SubjectId,
    short TopicId,
    short DifficultyLevelId,
    short LifecycleStatusId,
    string LifecycleStatusName,
    string? QuizResultStatusName = null,
    string ReviewDisplayMode = "ScoreOnly",
    string ApprovalStatus = "Pending",
    string? RejectionReason = null,
    IReadOnlyList<QuizApprovalEventItem>? ApprovalHistory = null,
    int? SchoolId = null,
    int? CampusId = null,
    short? RandomQuestionCount = null,
    string CreatorDisplayName = "",
    DateTimeOffset? CreatedAt = null);

/// <summary>One quiz workflow event projected from app_approval.</summary>
public sealed record QuizApprovalEventItem(
    long ApprovalId,
    ApprovalAction Action,
    long ActorUserId,
    string ActorName,
    UserRole ActorRole,
    string? Reason,
    DateTimeOffset OccurredAt);

/// <summary>School and campus resolved from a linked student when a parent creates a quiz.</summary>
public sealed record StudentSchoolContext(
    int? SchoolId,
    int? CampusId,
    short Grade,
    string Section = "");

/// <summary>Assignment row with student display name and attempt count for manage UI.</summary>
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

/// <summary>Question attached to a quiz, including options and fill-blank accepted answers for scoring.</summary>
public sealed record QuizQuestionItem(
    long QuestionId,
    string QuestionText,
    short QuestionTypeId,
    string QuestionTypeName,
    short Marks,
    short DisplayOrder,
    string? Hint,
    string? Explanation,
    short EstimatedTimeSeconds,
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
    short MaximumLength,
    bool AllowAiReview = false,
    bool AllowTeacherReview = false);

public sealed record QuizQuestionOptionItem(
    long OptionId,
    string OptionText,
    string? OptionImageUrl,
    bool IsCorrect);

/// <summary>Submitted attempt with per-question answers and aggregate score.</summary>
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
    IReadOnlyList<long> SelectedOptionIds,
    bool IsMarkedForReview = false,
    string QuestionTypeName = "",
    string? Hint = null,
    short EstimatedTimeSeconds = 0,
    short TimeSpentSeconds = 0,
    IReadOnlyList<QuestionAcceptedAnswerScoreItem>? AcceptedAnswers = null);

/// <summary>Assignment window and attempt quota checked before start/submit.</summary>
public sealed record QuizAssignmentAccess(
    long AssignmentId,
    long QuizId,
    long StudentId,
    DateTimeOffset StartDateTime,
    DateTimeOffset EndDateTime,
    short AllowedAttempts,
    int ExistingAttemptCount);

/// <summary>Cross-quiz assignment board row for monitor list.</summary>
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

/// <summary>Per-student progress row for quiz monitoring dashboard.</summary>
public sealed record QuizMonitoringStudentItem(
    long StudentId,
    string StudentName,
    long AssignmentId,
    int AttemptCount,
    short? BestPercentage,
    bool IsReviewDone,
    DateTimeOffset? LastSubmittedAt,
    DateTimeOffset StartDateTime,
    DateTimeOffset EndDateTime,
    short FocusLossCount = 0,
    short ClipboardPasteCount = 0);

/// <summary>Submitted attempt awaiting teacher/parent review of subjective answers.</summary>
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

/// <summary>Full review workspace for one submitted attempt.</summary>
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
    IReadOnlyList<AttemptReviewQuestionItem> Questions,
    short FocusLossCount = 0,
    short ClipboardPasteCount = 0);

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
    IReadOnlyList<long> SelectedOptionIds,
    IReadOnlyList<QuizQuestionOptionItem> Options,
    bool HasHumanReviewFeedback = false,
    string? AiFeedback = null);

/// <summary>Source question snapshot used when duplicating a quiz (reuse bank rows).</summary>
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

/// <summary>Whether subjective review is required and completed for an assignment.</summary>
public sealed record QuizAssignmentReviewState(
    long AssignmentId,
    bool IsReviewDone,
    bool IsReviewRequired);

/// <summary>Surprise assignment that just became visible to a student (Upcoming → open).</summary>
public sealed record QuizAssignmentOpenedNotice(
    long QuizId,
    string QuizTitle,
    long StudentId);

/// <summary>Result of promoting/expiring assignment windows.</summary>
public sealed record QuizAssignmentLifecycleMaintenanceResult(
    int ChangedCount,
    IReadOnlyList<QuizAssignmentOpenedNotice> NewlyOpenedSurpriseAssignments);

