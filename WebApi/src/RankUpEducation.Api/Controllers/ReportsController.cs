using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Application.Reports;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.Reports;

namespace RankUpEducation.Api.Controllers;

/// <summary>Quiz analytics and student history reports scoped by role.</summary>
[ApiController]
[Authorize]
[Route("api/reports")]
public sealed class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    /// <summary>Creates the reports controller.</summary>
    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    /// <summary>Returns aggregate quiz metrics for the caller's scope.</summary>
    [HttpGet("quiz-summary")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,Teacher")]
    public async Task<ActionResult<ApiResponse<QuizSummaryReportResponse>>> GetQuizSummaryAsync(
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        CancellationToken cancellationToken)
    {
        var response = await _reportService.GetQuizSummaryAsync(from, to, cancellationToken);
        return Ok(ApiResponse<QuizSummaryReportResponse>.Ok(response));
    }

    /// <summary>Returns per-student performance for one quiz.</summary>
    [HttpGet("quizzes/{quizId:long}/performance")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,Teacher")]
    public async Task<ActionResult<ApiResponse<QuizPerformanceReportResponse>>> GetQuizPerformanceAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var response = await _reportService.GetQuizPerformanceAsync(quizId, cancellationToken);
        return Ok(ApiResponse<QuizPerformanceReportResponse>.Ok(response));
    }

    /// <summary>Returns quiz attempt history when the caller may view the student.</summary>
    [HttpGet("students/{studentId:long}/quiz-history")]
    public async Task<ActionResult<ApiResponse<StudentQuizHistoryResponse>>> GetStudentQuizHistoryAsync(
        long studentId,
        CancellationToken cancellationToken)
    {
        var response = await _reportService.GetStudentQuizHistoryAsync(studentId, cancellationToken);
        return Ok(ApiResponse<StudentQuizHistoryResponse>.Ok(response));
    }

    /// <summary>Returns a ranked leaderboard for an optional quiz.</summary>
    [HttpGet("rankings")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,Teacher")]
    public async Task<ActionResult<ApiResponse<RankingReportResponse>>> GetRankingsAsync(
        [FromQuery] long? quizId,
        CancellationToken cancellationToken)
    {
        var response = await _reportService.GetRankingsAsync(quizId, cancellationToken);
        return Ok(ApiResponse<RankingReportResponse>.Ok(response));
    }
}
