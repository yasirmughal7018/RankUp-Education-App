namespace RankUpEducation.Contracts.Reports;

public sealed record QuizSummaryReportResponse(
    int TotalQuizzes,
    int PublishedQuizzes,
    int TotalAssignments,
    int SubmittedAttempts,
    int PendingReviews,
    int ReviewedAssignments,
    short? AveragePercentage);

public sealed record QuizPerformanceReportResponse(
    long QuizId,
    string QuizTitle,
    short TotalStudents,
    short SubmittedCount,
    short PendingReviewCount,
    short ReviewedCount,
    short? AveragePercentage,
    IReadOnlyList<QuizPerformanceStudentResponse> Students);

public sealed record QuizPerformanceStudentResponse(
    long StudentId,
    string StudentName,
    int AttemptCount,
    short? BestPercentage,
    bool IsReviewDone,
    string Status);

public sealed record StudentQuizHistoryResponse(
    long StudentId,
    string StudentName,
    IReadOnlyList<StudentQuizHistoryItemResponse> Items);

public sealed record StudentQuizHistoryItemResponse(
    long QuizId,
    string QuizTitle,
    long? AttemptId,
    short AttemptCount,
    short? BestPercentage,
    string ResultStatus,
    bool IsReviewDone,
    DateTimeOffset? LastSubmittedAt);

public sealed record RankingReportResponse(
    long? QuizId,
    string Title,
    IReadOnlyList<RankingItemResponse> Items);

public sealed record RankingItemResponse(
    int Rank,
    long StudentId,
    string StudentName,
    short BestPercentage,
    int AttemptCount);
