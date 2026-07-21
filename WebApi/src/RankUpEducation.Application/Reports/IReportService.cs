using RankUpEducation.Contracts.Reports;

namespace RankUpEducation.Application.Reports;

/// <summary>Role-scoped quiz analytics and student history reports.</summary>
public interface IReportService
{
    /// <summary>Aggregate quiz and assignment metrics for the caller's scope.</summary>
    Task<QuizSummaryReportResponse> GetQuizSummaryAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken);

    /// <summary>Per-student performance breakdown for one quiz.</summary>
    Task<QuizPerformanceReportResponse> GetQuizPerformanceAsync(
        long quizId,
        CancellationToken cancellationToken);

    /// <summary>Quiz attempt history for a student when the caller may view them.</summary>
    Task<StudentQuizHistoryResponse> GetStudentQuizHistoryAsync(
        long studentId,
        CancellationToken cancellationToken);

    /// <summary>Ranked student scores for one quiz or across the caller's scope.</summary>
    Task<RankingReportResponse> GetRankingsAsync(
        long? quizId,
        CancellationToken cancellationToken);
}
