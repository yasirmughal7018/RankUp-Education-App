using RankUpEducation.Contracts.QuizQuestions;

namespace RankUpEducation.Contracts.Quizzes;

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

public sealed record AssignQuizRequest(
    string Mode,
    IReadOnlyList<long>? StudentIds,
    long? GroupId,
    DateTimeOffset StartAt,
    DateTimeOffset EndAt,
    short AllowedAttempts,
    short? GradeId = null);

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

public sealed record AssignQuizResponse(
    long QuizId,
    string LifecycleStatus,
    int AssignmentsCreated,
    IReadOnlyList<QuizAssignmentResponse> Assignments);

public sealed record CancelQuizResponse(
    long QuizId,
    string LifecycleStatus,
    int AssignmentsRemoved);

public sealed record DuplicateQuizResponse(
    long SourceQuizId,
    ManageQuizResponse Quiz);

public sealed record ArchiveQuizResponse(
    long QuizId,
    string LifecycleStatus);

public sealed record AllowRetryRequest(short ExtraAttempts = 1);

public sealed record AllowRetryResponse(
    long AssignmentId,
    long QuizId,
    long StudentId,
    string StudentName,
    short AllowedAttempts,
    int AttemptCount,
    bool IsReviewDone);

public sealed record ApproveQuizResponse(
    long QuizId,
    string ApprovalStatus,
    string LifecycleStatus);

public sealed record RejectQuizRequest(string? Reason = null);

public sealed record RejectQuizResponse(
    long QuizId,
    string ApprovalStatus,
    string LifecycleStatus,
    string? Reason);

public sealed record PendingQuizApprovalListResponse(IReadOnlyList<PendingQuizApprovalItemResponse> Items);

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
