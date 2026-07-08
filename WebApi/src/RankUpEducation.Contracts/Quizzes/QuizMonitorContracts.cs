namespace RankUpEducation.Contracts.Quizzes;

public sealed record QuizAssignmentBoardResponse(IReadOnlyList<QuizAssignmentBoardItemResponse> Items);

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

public sealed record QuizMonitoringResponse(
    long QuizId,
    string QuizTitle,
    short TotalStudents,
    short SubmittedCount,
    short PendingReviewCount,
    short ReviewedCount,
    IReadOnlyList<QuizMonitoringStudentResponse> Students);

public sealed record QuizMonitoringStudentResponse(
    long StudentId,
    string StudentName,
    long AssignmentId,
    int AttemptCount,
    short? BestPercentage,
    bool IsReviewDone,
    string Status,
    DateTimeOffset? LastSubmittedAt);
