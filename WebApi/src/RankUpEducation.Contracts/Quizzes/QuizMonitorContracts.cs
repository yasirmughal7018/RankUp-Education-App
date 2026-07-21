namespace RankUpEducation.Contracts.Quizzes;

public sealed record QuizAssignmentBoardResponse(IReadOnlyList<QuizAssignmentBoardItemResponse> Items);

/// <summary>Assignment row on the cross-quiz monitor board.</summary>
public sealed record QuizAssignmentBoardItemResponse(
    long AssignmentId,
    long QuizId,
    string QuizTitle,
    long StudentId,
    string StudentName,
    DateTimeOffset StartAt,
    DateTimeOffset EndAt,
    short AllowedAttempts,
    int AttemptCount,
    bool IsReviewDone,
    string ResultStatus,
    string MonitorStatus);

/// <summary>Aggregate monitoring stats and per-student rows for one quiz.</summary>
public sealed record QuizMonitoringResponse(
    long QuizId,
    string QuizTitle,
    short TotalStudents,
    short SubmittedCount,
    short PendingReviewCount,
    short ReviewedCount,
    IReadOnlyList<QuizMonitoringStudentResponse> Students);

/// <summary>Per-student monitor row with derived status chip.</summary>
public sealed record QuizMonitoringStudentResponse(
    long StudentId,
    string StudentName,
    long AssignmentId,
    int AttemptCount,
    short? BestPercentage,
    bool IsReviewDone,
    string Status,
    DateTimeOffset? LastSubmittedAt);
