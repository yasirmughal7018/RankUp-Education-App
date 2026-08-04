using RankUpEducation.Contracts.Reports;

namespace RankUpEducation.Application.Reports;

/// <summary>EF-backed queries that assemble report DTOs with optional scope filters.</summary>
public interface IReportRepository
{
    /// <summary>Builds quiz summary aggregates filtered by school, campus, creator, and date range.</summary>
    Task<QuizSummaryReportResponse> GetQuizSummaryAsync(
        int? schoolId,
        int? campusId,
        long? creatorUserId,
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken);

    /// <summary>Builds per-student performance for a quiz, or null when the quiz is out of scope.</summary>
    Task<QuizPerformanceReportResponse?> GetQuizPerformanceAsync(
        long quizId,
        int? schoolId,
        int? campusId,
        long? creatorUserId,
        CancellationToken cancellationToken);

    /// <summary>Lists quiz attempts and outcomes for one student.</summary>
    Task<StudentQuizHistoryResponse> GetStudentQuizHistoryAsync(
        long studentId,
        CancellationToken cancellationToken);

    /// <summary>Builds a ranked leaderboard for an optional quiz within scope.</summary>
    Task<RankingReportResponse> GetRankingsAsync(
        long? quizId,
        int? schoolId,
        int? campusId,
        long? creatorUserId,
        CancellationToken cancellationToken);
}
