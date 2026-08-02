using RankUpEducation.Contracts.QuizQuestions;

namespace RankUpEducation.Contracts.Quizzes;

/// <summary>
/// Payload for creating a draft quiz.
/// Parents may pass <see cref="ContextStudentId"/> for school/campus scope.
/// Topic and difficulty are optional (omit or 0 → stored as NULL).
/// PortalAdmin may omit <see cref="SchoolId"/> and <see cref="CampusId"/>; SchoolAdmin may omit CampusId
/// (omit / 0 → NULL so school/campus FKs are not violated).
/// </summary>
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
    short? QuizTypeId = null,
    string? NavigationMode = null,
    string? ReviewDisplayMode = null,
    int? SchoolId = null,
    int? CampusId = null);

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
    bool IsReviewRequired,
    string? NavigationMode = null,
    string? ReviewDisplayMode = null);

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
    string ApprovalStatus,
    string? RejectionReason,
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
    string NavigationMode,
    string ReviewDisplayMode,
    string CreatedBy,
    string SchoolName,
    IReadOnlyList<ManageQuizQuestionResponse> Questions);

/// <summary>
/// Assignment request. Modes: one, selected, group, allLinked (parent), allInGrade / allInSection (teacher),
/// allInSchool (school admin), multiSchool / public (portal admin).
/// </summary>
public sealed record AssignQuizRequest(
    string Mode,
    IReadOnlyList<long>? StudentIds,
    long? GroupId,
    DateTimeOffset StartAt,
    DateTimeOffset EndAt,
    short AllowedAttempts,
    short? GradeId = null,
    string? Section = null,
    IReadOnlyList<int>? SchoolIds = null);

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

/// <summary>
/// Archive confirmation. When <see cref="PermanentlyDeleted"/> is true, the quiz row was removed
/// because it was unassigned or not started yet.
/// </summary>
public sealed record ArchiveQuizResponse(
    long QuizId,
    string LifecycleStatus,
    bool PermanentlyDeleted = false);

/// <summary>Unarchive confirmation with the restored lifecycle status.</summary>
public sealed record UnarchiveQuizResponse(
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

/// <summary>Rejection reason required when denying a teacher quiz.</summary>
public sealed record RejectQuizRequest(string Reason);

/// <summary>School-admin rejection confirmation.</summary>
public sealed record RejectQuizResponse(
    long QuizId,
    string ApprovalStatus,
    string LifecycleStatus,
    string? Reason);

public sealed record PendingQuizApprovalListResponse(IReadOnlyList<PendingQuizApprovalItemResponse> Items);

/// <summary>Teacher quiz awaiting school-admin approval (Pending or Rejected awaiting re-review).</summary>
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
    DateOnly ModifiedDate,
    string? RejectionReason = null);
