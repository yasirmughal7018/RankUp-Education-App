using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.Quizzes;

namespace RankUpEducation.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/quizzes")]
public sealed class QuizzesController : ControllerBase
{
    private readonly IQuizService _quizService;
    private readonly IQuizManageService _quizManageService;
    private readonly IQuizAssignService _quizAssignService;
    private readonly IQuizMonitorService _quizMonitorService;
    private readonly IQuizReviewService _quizReviewService;

    public QuizzesController(
        IQuizService quizService,
        IQuizManageService quizManageService,
        IQuizAssignService quizAssignService,
        IQuizMonitorService quizMonitorService,
        IQuizReviewService quizReviewService)
    {
        _quizService = quizService;
        _quizManageService = quizManageService;
        _quizAssignService = quizAssignService;
        _quizMonitorService = quizMonitorService;
        _quizReviewService = quizReviewService;
    }

    /// <summary>
    /// Lists quizzes for the authenticated role (student assignments, teacher school quizzes, parent child quizzes).
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<QuizListResponse>>> ListAsync(
        [FromQuery] string? search,
        [FromQuery] string? subject,
        [FromQuery] string? grade,
        CancellationToken cancellationToken)
    {
        var response = await _quizService.ListAsync(search, subject, grade, cancellationToken);
        return Ok(ApiResponse<QuizListResponse>.Ok(response));
    }

    [HttpGet("assignments")]
    public async Task<ActionResult<ApiResponse<QuizAssignmentBoardResponse>>> ListAllAssignmentsAsync(
        [FromQuery] long? studentId,
        CancellationToken cancellationToken)
    {
        var response = await _quizMonitorService.ListAssignmentsAsync(studentId, cancellationToken);
        return Ok(ApiResponse<QuizAssignmentBoardResponse>.Ok(response));
    }

    [HttpGet("reviews/pending")]
    public async Task<ActionResult<ApiResponse<PendingReviewListResponse>>> ListPendingReviewsAsync(
        CancellationToken cancellationToken)
    {
        var response = await _quizReviewService.ListPendingAsync(cancellationToken);
        return Ok(ApiResponse<PendingReviewListResponse>.Ok(response));
    }

    [HttpGet("pending-approval")]
    [Authorize(Roles = "SuperAdmin,SchoolAdmin")]
    public async Task<ActionResult<ApiResponse<PendingQuizApprovalListResponse>>> ListPendingApprovalAsync(
        CancellationToken cancellationToken)
    {
        var response = await _quizManageService.ListPendingApprovalAsync(cancellationToken);
        return Ok(ApiResponse<PendingQuizApprovalListResponse>.Ok(response));
    }

    /// <summary>Returns quiz instructions, timing, and attempt rules for the current user.</summary>
    [HttpGet("{quizId:long}")]
    public async Task<ActionResult<ApiResponse<QuizDetailResponse>>> GetDetailAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var response = await _quizService.GetDetailAsync(quizId, cancellationToken);
        return Ok(ApiResponse<QuizDetailResponse>.Ok(response));
    }

    /// <summary>Starts a new quiz attempt for a student within the assignment window.</summary>
    [HttpPost("{quizId:long}/attempts")]
    public async Task<ActionResult<ApiResponse<StartQuizAttemptResponse>>> StartAttemptAsync(
        long quizId,
        [FromBody] StartQuizAttemptRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _quizService.StartAttemptAsync(quizId, request, cancellationToken);
        var message = response.Resumed ? "Quiz attempt resumed." : "Quiz attempt started.";
        return Ok(ApiResponse<StartQuizAttemptResponse>.Ok(response, message));
    }

    /// <summary>Saves draft answers for an in-progress attempt without submitting.</summary>
    [HttpPut("{quizId:long}/attempts/{attemptId:long}/draft")]
    public async Task<ActionResult<ApiResponse<SaveQuizAttemptAnswersResponse>>> SaveAttemptAnswersAsync(
        long quizId,
        long attemptId,
        [FromBody] SaveQuizAttemptAnswersRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _quizService.SaveAttemptAnswersAsync(
            quizId,
            attemptId,
            request,
            cancellationToken);
        return Ok(ApiResponse<SaveQuizAttemptAnswersResponse>.Ok(response, "Answers saved."));
    }

    /// <summary>Submits answers and scores the attempt.</summary>
    [HttpPost("{quizId:long}/attempts/{attemptId:long}/submit")]
    public async Task<ActionResult<ApiResponse<QuizAttemptResultResponse>>> SubmitAttemptAsync(
        long quizId,
        long attemptId,
        [FromBody] SubmitQuizAttemptRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _quizService.SubmitAttemptAsync(quizId, attemptId, request, cancellationToken);
        return Ok(ApiResponse<QuizAttemptResultResponse>.Ok(response, "Quiz submitted successfully."));
    }

    /// <summary>Returns a previously submitted attempt with review details.</summary>
    [HttpGet("{quizId:long}/attempts/{attemptId:long}/result")]
    public async Task<ActionResult<ApiResponse<QuizAttemptResultResponse>>> GetAttemptResultAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken)
    {
        var response = await _quizService.GetAttemptResultAsync(quizId, attemptId, cancellationToken);
        return Ok(ApiResponse<QuizAttemptResultResponse>.Ok(response));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ManageQuizResponse>>> CreateAsync(
        [FromBody] CreateQuizRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _quizManageService.CreateAsync(request, cancellationToken);
        return Ok(ApiResponse<ManageQuizResponse>.Ok(response, "Quiz created."));
    }

    [HttpPut("{quizId:long}")]
    public async Task<ActionResult<ApiResponse<ManageQuizResponse>>> UpdateAsync(
        long quizId,
        [FromBody] UpdateQuizRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _quizManageService.UpdateAsync(quizId, request, cancellationToken);
        return Ok(ApiResponse<ManageQuizResponse>.Ok(response, "Quiz updated."));
    }

    [HttpDelete("{quizId:long}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        await _quizManageService.DeleteAsync(quizId, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { quizId }, "Quiz deleted."));
    }

    [HttpGet("{quizId:long}/manage")]
    public async Task<ActionResult<ApiResponse<ManageQuizResponse>>> GetManageDetailAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var response = await _quizManageService.GetManageDetailAsync(quizId, cancellationToken);
        return Ok(ApiResponse<ManageQuizResponse>.Ok(response));
    }

    [HttpPost("{quizId:long}/publish")]
    public async Task<ActionResult<ApiResponse<ManageQuizResponse>>> PublishAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var response = await _quizManageService.PublishAsync(quizId, cancellationToken);
        return Ok(ApiResponse<ManageQuizResponse>.Ok(response, "Quiz published."));
    }

    [HttpPost("{quizId:long}/assign")]
    public async Task<ActionResult<ApiResponse<AssignQuizResponse>>> AssignAsync(
        long quizId,
        [FromBody] AssignQuizRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _quizAssignService.AssignAsync(quizId, request, cancellationToken);
        return Ok(ApiResponse<AssignQuizResponse>.Ok(response, "Quiz assigned."));
    }

    [HttpGet("{quizId:long}/assignments")]
    public async Task<ActionResult<ApiResponse<QuizAssignmentListResponse>>> ListAssignmentsAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var response = await _quizAssignService.ListAssignmentsAsync(quizId, cancellationToken);
        return Ok(ApiResponse<QuizAssignmentListResponse>.Ok(response));
    }

    [HttpPost("{quizId:long}/cancel")]
    public async Task<ActionResult<ApiResponse<CancelQuizResponse>>> CancelAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var response = await _quizAssignService.CancelAsync(quizId, cancellationToken);
        return Ok(ApiResponse<CancelQuizResponse>.Ok(response, "Quiz assignments cancelled."));
    }

    [HttpGet("{quizId:long}/monitoring")]
    public async Task<ActionResult<ApiResponse<QuizMonitoringResponse>>> GetMonitoringAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var response = await _quizMonitorService.GetMonitoringAsync(quizId, cancellationToken);
        return Ok(ApiResponse<QuizMonitoringResponse>.Ok(response));
    }

    [HttpGet("{quizId:long}/attempts/{attemptId:long}/review")]
    public async Task<ActionResult<ApiResponse<AttemptReviewResponse>>> GetAttemptReviewAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken)
    {
        var response = await _quizReviewService.GetReviewDetailAsync(quizId, attemptId, cancellationToken);
        return Ok(ApiResponse<AttemptReviewResponse>.Ok(response));
    }

    [HttpPut("{quizId:long}/attempts/{attemptId:long}/answers")]
    public async Task<ActionResult<ApiResponse<AttemptReviewResponse>>> MarkAttemptAnswersAsync(
        long quizId,
        long attemptId,
        [FromBody] MarkAttemptAnswersRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _quizReviewService.MarkAnswersAsync(quizId, attemptId, request, cancellationToken);
        return Ok(ApiResponse<AttemptReviewResponse>.Ok(response, "Attempt answers updated."));
    }

    [HttpPost("{quizId:long}/attempts/{attemptId:long}/finalize-review")]
    public async Task<ActionResult<ApiResponse<FinalizeReviewResponse>>> FinalizeReviewAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken)
    {
        var response = await _quizReviewService.FinalizeAsync(quizId, attemptId, cancellationToken);
        return Ok(ApiResponse<FinalizeReviewResponse>.Ok(response, "Review finalized."));
    }

    [HttpPost("{quizId:long}/duplicate")]
    public async Task<ActionResult<ApiResponse<DuplicateQuizResponse>>> DuplicateAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var response = await _quizManageService.DuplicateAsync(quizId, cancellationToken);
        return Ok(ApiResponse<DuplicateQuizResponse>.Ok(response, "Quiz duplicated."));
    }

    [HttpPost("{quizId:long}/archive")]
    public async Task<ActionResult<ApiResponse<ArchiveQuizResponse>>> ArchiveAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var response = await _quizManageService.ArchiveAsync(quizId, cancellationToken);
        return Ok(ApiResponse<ArchiveQuizResponse>.Ok(response, "Quiz archived."));
    }

    [HttpPost("{quizId:long}/assignments/{assignmentId:long}/allow-retry")]
    public async Task<ActionResult<ApiResponse<AllowRetryResponse>>> AllowRetryAsync(
        long quizId,
        long assignmentId,
        [FromBody] AllowRetryRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _quizAssignService.AllowRetryAsync(quizId, assignmentId, request, cancellationToken);
        return Ok(ApiResponse<AllowRetryResponse>.Ok(response, "Retry allowed."));
    }

    [HttpPost("{quizId:long}/approve")]
    public async Task<ActionResult<ApiResponse<ApproveQuizResponse>>> ApproveAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var response = await _quizManageService.ApproveAsync(quizId, cancellationToken);
        return Ok(ApiResponse<ApproveQuizResponse>.Ok(response, "Quiz approved."));
    }

    [HttpPost("{quizId:long}/reject")]
    [Authorize(Roles = "SuperAdmin,SchoolAdmin")]
    public async Task<ActionResult<ApiResponse<RejectQuizResponse>>> RejectAsync(
        long quizId,
        [FromBody] RejectQuizRequest? request,
        CancellationToken cancellationToken)
    {
        var response = await _quizManageService.RejectAsync(
            quizId,
            request ?? new RejectQuizRequest(),
            cancellationToken);
        return Ok(ApiResponse<RejectQuizResponse>.Ok(response, "Quiz rejected."));
    }
}
