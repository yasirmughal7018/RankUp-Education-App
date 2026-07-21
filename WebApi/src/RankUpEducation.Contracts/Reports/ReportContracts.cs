namespace RankUpEducation.Contracts.Reports;

/// <summary>High-level quiz and assignment metrics for admin/teacher dashboards.</summary>
public sealed record QuizSummaryReportResponse(
    int TotalQuizzes,
    int PublishedQuizzes,
    int TotalAssignments,
    int SubmittedAttempts,
    int PendingReviews,
    int ReviewedAssignments,
    short? AveragePercentage);

/// <summary>Per-quiz participation, review progress, and student breakdown.</summary>
public sealed record QuizPerformanceReportResponse(
    long QuizId,
    string QuizTitle,
    short TotalStudents,
    short SubmittedCount,
    short PendingReviewCount,
    short ReviewedCount,
    short? AveragePercentage,
    IReadOnlyList<QuizPerformanceStudentResponse> Students);

/// <summary>One student's row in a quiz performance report.</summary>
public sealed record QuizPerformanceStudentResponse(
    long StudentId,
    string StudentName,
    int AttemptCount,
    short? BestPercentage,
    bool IsReviewDone,
    string Status);

/// <summary>Chronological quiz attempt history for one student.</summary>
public sealed record StudentQuizHistoryResponse(
    long StudentId,
    string StudentName,
    IReadOnlyList<StudentQuizHistoryItemResponse> Items);

/// <summary>One quiz entry in a student's history.</summary>
public sealed record StudentQuizHistoryItemResponse(
    long QuizId,
    string QuizTitle,
    long? AttemptId,
    short AttemptCount,
    short? BestPercentage,
    string ResultStatus,
    bool IsReviewDone,
    DateTimeOffset? LastSubmittedAt);

/// <summary>Ranked leaderboard for a quiz or scoped cohort.</summary>
public sealed record RankingReportResponse(
    long? QuizId,
    string Title,
    IReadOnlyList<RankingItemResponse> Items);

/// <summary>One row on a quiz ranking leaderboard.</summary>
public sealed record RankingItemResponse(
    int Rank,
    long StudentId,
    string StudentName,
    short BestPercentage,
    int AttemptCount);
