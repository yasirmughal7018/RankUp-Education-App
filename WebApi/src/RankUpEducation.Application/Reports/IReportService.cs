using RankUpEducation.Contracts.Reports;

namespace RankUpEducation.Application.Reports;

public interface IReportService
{
    Task<QuizSummaryReportResponse> GetQuizSummaryAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken);

    Task<QuizPerformanceReportResponse> GetQuizPerformanceAsync(
        long quizId,
        CancellationToken cancellationToken);

    Task<StudentQuizHistoryResponse> GetStudentQuizHistoryAsync(
        long studentId,
        CancellationToken cancellationToken);

    Task<RankingReportResponse> GetRankingsAsync(
        long? quizId,
        CancellationToken cancellationToken);
}
