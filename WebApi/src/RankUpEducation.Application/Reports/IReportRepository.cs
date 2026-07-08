using RankUpEducation.Contracts.Reports;

namespace RankUpEducation.Application.Reports;

public interface IReportRepository
{
    Task<QuizSummaryReportResponse> GetQuizSummaryAsync(
        int? schoolId,
        int? campusId,
        long? creatorUserId,
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken);

    Task<QuizPerformanceReportResponse?> GetQuizPerformanceAsync(
        long quizId,
        int? schoolId,
        int? campusId,
        long? creatorUserId,
        CancellationToken cancellationToken);

    Task<StudentQuizHistoryResponse> GetStudentQuizHistoryAsync(
        long studentId,
        CancellationToken cancellationToken);

    Task<RankingReportResponse> GetRankingsAsync(
        long? quizId,
        int? schoolId,
        int? campusId,
        long? creatorUserId,
        CancellationToken cancellationToken);
}
