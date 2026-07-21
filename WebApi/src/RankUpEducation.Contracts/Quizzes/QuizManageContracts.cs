using RankUpEducation.Contracts.QuizQuestions;

namespace RankUpEducation.Contracts.Quizzes;

/// <summary>Payload for creating a draft quiz; parents may pass <see cref="ContextStudentId"/> for school/campus scope.</summary>
public sealed record CreateQuizRequest(
    string Title,
    string Description,
    short ClassId,
    short SubjectId,
    short TopicId,
    short DifficultyLevelId,
    string Instructions,
    short? TimeLimitMinutes,
    short? AllowedAttempts,
    bool ShuffleQuestions,
    bool ShuffleOptions,
    bool IsReviewRequired,
    long? ContextStudentId,
    short? QuizTypeId = null);

/// <summary>Editable quiz metadata (blocked after assignment window starts).</summary>
public sealed record UpdateQuizRequest(
    string Title,
    string Description,
    short ClassId,
    short SubjectId,
    short TopicId,
    short DifficultyLevelId,
    string Instructions,
    short? TimeLimitMinutes,
    short? AllowedAttempts,
    bool ShuffleQuestions,
    bool ShuffleOptions,
    bool IsReviewRequired);

/// <summary>Owner manage view returned after create/update/publish/question changes.</summary>
public sealed record ManageQuizResponse(
    long Id,
    string Title,
    string Description,
    string Subject,
    string Grade,
    string Topic,
    string QuizType,
    string Difficulty,
    string LifecycleStatus,
    short ClassId,
    short SubjectId,
    short TopicId,
    short DifficultyLevelId,
    short QuestionCount,
    short TotalMarks,
    short? TimeLimitMinutes,
    short? AllowedAttempts,
    IReadOnlyList<string> Instructions,
    bool ShuffleQuestions,
    bool ShuffleOptions,
    bool IsReviewRequired,
    string CreatedBy,
    string SchoolName,
    IReadOnlyList<ManageQuizQuestionResponse> Questions);

/// <summary>
/// Assignment request. <see cref="Mode"/> values: one, selected, group, allLinked (parent), allInGrade (teacher).
/// </summary>
public sealed record AssignQuizRequest(
    string Mode,
    IReadOnlyList<long>? StudentIds,
    long? GroupId,
    DateTimeOffset StartAt,
    DateTimeOffset EndAt,
    short AllowedAttempts,
    short? GradeId = null);

/// <summary>One student assignment with attempt and review summary.</summary>
public sealed record QuizAssignmentResponse(
    long AssignmentId,
    long StudentId,
    string StudentName,
    long? GroupId,
    DateTimeOffset StartAt,
    DateTimeOffset EndAt,
    short AllowedAttempts,
    int AttemptCount,
    bool IsReviewDone,
    string ResultStatus);

public sealed record QuizAssignmentListResponse(IReadOnlyList<QuizAssignmentResponse> Items);

/// <summary>Result of assigning a quiz; includes newly created assignment rows.</summary>
public sealed record AssignQuizResponse(
    long QuizId,
    string LifecycleStatus,
    int AssignmentsCreated,
    IReadOnlyList<QuizAssignmentResponse> Assignments);

/// <summary>Result of cancelling future assignments.</summary>
public sealed record CancelQuizResponse(
    long QuizId,
    string LifecycleStatus,
    int AssignmentsRemoved);

/// <summary>Deep copy result with the new draft quiz manage payload.</summary>
public sealed record DuplicateQuizResponse(
    long SourceQuizId,
    ManageQuizResponse Quiz);

/// <summary>Archive confirmation with updated lifecycle status.</summary>
public sealed record ArchiveQuizResponse(
    long QuizId,
    string LifecycleStatus);

/// <summary>Extra attempts to grant after review finalization.</summary>
public sealed record AllowRetryRequest(short ExtraAttempts = 1);

/// <summary>Updated assignment quotas after a retry grant.</summary>
public sealed record AllowRetryResponse(
    long AssignmentId,
    long QuizId,
    long StudentId,
    string StudentName,
    short AllowedAttempts,
    int AttemptCount,
    bool IsReviewDone);

/// <summary>School-admin approval confirmation.</summary>
public sealed record ApproveQuizResponse(
    long QuizId,
    string ApprovalStatus,
    string LifecycleStatus);

/// <summary>Optional rejection reason for teacher quiz approval queue.</summary>
public sealed record RejectQuizRequest(string? Reason = null);

/// <summary>School-admin rejection confirmation.</summary>
public sealed record RejectQuizResponse(
    long QuizId,
    string ApprovalStatus,
    string LifecycleStatus,
    string? Reason);

public sealed record PendingQuizApprovalListResponse(IReadOnlyList<PendingQuizApprovalItemResponse> Items);

/// <summary>Teacher quiz awaiting school-admin approval.</summary>
public sealed record PendingQuizApprovalItemResponse(
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
