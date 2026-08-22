using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.Quizzes;

namespace RankUpEducation.Api.Controllers;

/// <summary>
/// Quiz API: student attempts, teacher/parent manage (create/publish/assign), review, approval, and monitoring.
/// </summary>
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

    /// <summary>Cross-quiz assignment board for the authenticated quiz owner.</summary>
    [HttpGet("assignments")]
    public async Task<ActionResult<ApiResponse<QuizAssignmentBoardResponse>>> ListAllAssignmentsAsync(
        [FromQuery] long? studentId,
        CancellationToken cancellationToken)
    {
        var response = await _quizMonitorService.ListAssignmentsAsync(studentId, cancellationToken);
        return Ok(ApiResponse<QuizAssignmentBoardResponse>.Ok(response));
    }

    /// <summary>Lists submitted attempts awaiting subjective-answer review.</summary>
    [HttpGet("reviews/pending")]
    public async Task<ActionResult<ApiResponse<PendingReviewListResponse>>> ListPendingReviewsAsync(
        CancellationToken cancellationToken)
    {
        var response = await _quizReviewService.ListPendingAsync(cancellationToken);
        return Ok(ApiResponse<PendingReviewListResponse>.Ok(response));
    }

    /// <summary>Approval queue: PortalAdmin (all schools), SchoolAdmin (own school), CampusAdmin (own campus).</summary>
    [HttpGet("pending-approval")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
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

    /// <summary>Uploads a binary file for a File Upload question (stores URL in draft answer text).</summary>
    [HttpPost("{quizId:long}/attempts/{attemptId:long}/questions/{attemptQuestionId:long}/upload")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<ApiResponse<UploadQuizAttemptFileResponse>>> UploadAttemptFileAsync(
        long quizId,
        long attemptId,
        long attemptQuestionId,
        IFormFile file,
        [FromForm] string deviceId,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length <= 0)
        {
            return BadRequest(ApiResponse<UploadQuizAttemptFileResponse>.Fail("A file is required."));
        }

        await using var stream = file.OpenReadStream();
        var response = await _quizService.UploadAttemptAnswerFileAsync(
            quizId,
            attemptId,
            attemptQuestionId,
            stream,
            file.FileName,
            file.ContentType,
            deviceId,
            cancellationToken);
        return Ok(ApiResponse<UploadQuizAttemptFileResponse>.Ok(response, "File uploaded."));
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

    /// <summary>Replays a queued offline draft or submit after reconnect (idempotent via clientSyncId).</summary>
    [HttpPost("{quizId:long}/attempts/{attemptId:long}/sync")]
    public async Task<ActionResult<ApiResponse<SyncOfflineQuizAttemptResponse>>> SyncOfflineAttemptAsync(
        long quizId,
        long attemptId,
        [FromBody] SyncOfflineQuizAttemptRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _quizService.SyncOfflineAttemptAsync(
            quizId,
            attemptId,
            request,
            cancellationToken);
        return Ok(ApiResponse<SyncOfflineQuizAttemptResponse>.Ok(
            response,
            response.AlreadySynced ? "Already synced." : "Offline attempt synced."));
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

    /// <summary>Creates a draft quiz (parent or teacher).</summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<ManageQuizResponse>>> CreateAsync(
        [FromBody] CreateQuizRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _quizManageService.CreateAsync(request, cancellationToken);
        return Ok(ApiResponse<ManageQuizResponse>.Ok(response, "Quiz created."));
    }

    /// <summary>Updates quiz metadata while editable.</summary>
    [HttpPut("{quizId:long}")]
    public async Task<ActionResult<ApiResponse<ManageQuizResponse>>> UpdateAsync(
        long quizId,
        [FromBody] UpdateQuizRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _quizManageService.UpdateAsync(quizId, request, cancellationToken);
        return Ok(ApiResponse<ManageQuizResponse>.Ok(response, "Quiz updated."));
    }

    /// <summary>Permanently deletes a draft quiz with no assignments.</summary>
    [HttpDelete("{quizId:long}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        await _quizManageService.DeleteAsync(quizId, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { quizId }, "Quiz deleted."));
    }

    /// <summary>Owner manage view with attached questions.</summary>
    [HttpGet("{quizId:long}/manage")]
    public async Task<ActionResult<ApiResponse<ManageQuizResponse>>> GetManageDetailAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var response = await _quizManageService.GetManageDetailAsync(quizId, cancellationToken);
        return Ok(ApiResponse<ManageQuizResponse>.Ok(response));
    }

    /// <summary>Submit draft for approval (teacher/parent) or portal publish after endorsements.</summary>
    [HttpPost("{quizId:long}/publish")]
    public async Task<ActionResult<ApiResponse<ManageQuizResponse>>> PublishAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var response = await _quizManageService.PublishAsync(quizId, cancellationToken);
        return Ok(ApiResponse<ManageQuizResponse>.Ok(response, "Quiz published."));
    }

    /// <summary>Assigns quiz to students; moves lifecycle to Assigned.</summary>
    [HttpPost("{quizId:long}/assign")]
    public async Task<ActionResult<ApiResponse<AssignQuizResponse>>> AssignAsync(
        long quizId,
        [FromBody] AssignQuizRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _quizAssignService.AssignAsync(quizId, request, cancellationToken);
        return Ok(ApiResponse<AssignQuizResponse>.Ok(response, "Quiz assigned."));
    }

    /// <summary>Lists assignments for one quiz.</summary>
    [HttpGet("{quizId:long}/assignments")]
    public async Task<ActionResult<ApiResponse<QuizAssignmentListResponse>>> ListAssignmentsAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        if (quizId <= 0)
        {
            return NotFound(ApiResponse<QuizAssignmentListResponse>.Fail("Quiz was not found."));
        }

        var response = await _quizAssignService.ListAssignmentsAsync(quizId, cancellationToken);
        return Ok(ApiResponse<QuizAssignmentListResponse>.Ok(response));
    }

    /// <summary>Cancels upcoming assignments for a quiz.</summary>
    [HttpPost("{quizId:long}/cancel")]
    public async Task<ActionResult<ApiResponse<CancelQuizResponse>>> CancelAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var response = await _quizAssignService.CancelAsync(quizId, cancellationToken);
        return Ok(ApiResponse<CancelQuizResponse>.Ok(response, "Quiz assignments cancelled."));
    }

    /// <summary>Per-student attempt and review progress for one quiz.</summary>
    [HttpGet("{quizId:long}/monitoring")]
    public async Task<ActionResult<ApiResponse<QuizMonitoringResponse>>> GetMonitoringAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var response = await _quizMonitorService.GetMonitoringAsync(quizId, cancellationToken);
        return Ok(ApiResponse<QuizMonitoringResponse>.Ok(response));
    }

    /// <summary>Review workspace for a submitted attempt.</summary>
    [HttpGet("{quizId:long}/attempts/{attemptId:long}/review")]
    public async Task<ActionResult<ApiResponse<AttemptReviewResponse>>> GetAttemptReviewAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken)
    {
        var response = await _quizReviewService.GetReviewDetailAsync(quizId, attemptId, cancellationToken);
        return Ok(ApiResponse<AttemptReviewResponse>.Ok(response));
    }

    /// <summary>Marks subjective answers and saves teacher/parent feedback.</summary>
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

    /// <summary>Finalizes review and releases student-visible results.</summary>
    [HttpPost("{quizId:long}/attempts/{attemptId:long}/finalize-review")]
    public async Task<ActionResult<ApiResponse<FinalizeReviewResponse>>> FinalizeReviewAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken)
    {
        var response = await _quizReviewService.FinalizeAsync(quizId, attemptId, cancellationToken);
        return Ok(ApiResponse<FinalizeReviewResponse>.Ok(response, "Review finalized."));
    }

    /// <summary>Deep-copies quiz and questions into a new draft.</summary>
    /// <summary>Clones quiz metadata and reuses bank questions; returns the new draft manage payload.</summary>
    [HttpPost("{quizId:long}/duplicate")]
    public async Task<ActionResult<ApiResponse<ManageQuizResponse>>> DuplicateAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var response = await _quizManageService.DuplicateAsync(quizId, cancellationToken);
        // Return the new quiz directly so clients navigate with response.id (not nested .quiz).
        return Ok(ApiResponse<ManageQuizResponse>.Ok(response.Quiz, "Quiz duplicated."));
    }

    /// <summary>
    /// Archives a started quiz, or permanently deletes it when unassigned / not started yet.
    /// </summary>
    [HttpPost("{quizId:long}/archive")]
    public async Task<ActionResult<ApiResponse<ArchiveQuizResponse>>> ArchiveAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var response = await _quizManageService.ArchiveAsync(quizId, cancellationToken);
        var message = response.PermanentlyDeleted
            ? "Quiz deleted."
            : "Quiz archived.";
        return Ok(ApiResponse<ArchiveQuizResponse>.Ok(response, message));
    }

    /// <summary>Restores an archived quiz to Published or Assigned.</summary>
    [HttpPost("{quizId:long}/unarchive")]
    public async Task<ActionResult<ApiResponse<UnarchiveQuizResponse>>> UnarchiveAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        if (quizId <= 0)
        {
            return NotFound(ApiResponse<UnarchiveQuizResponse>.Fail("Quiz was not found."));
        }

        var response = await _quizManageService.UnarchiveAsync(quizId, cancellationToken);
        return Ok(ApiResponse<UnarchiveQuizResponse>.Ok(response, "Quiz unarchived."));
    }

    /// <summary>Grants additional attempts after review is finalized.</summary>
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

    /// <summary>School, campus, or portal admin approves a teacher quiz.</summary>
    [HttpPost("{quizId:long}/approve")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<ApproveQuizResponse>>> ApproveAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var response = await _quizManageService.ApproveAsync(quizId, cancellationToken);
        return Ok(ApiResponse<ApproveQuizResponse>.Ok(response, "Quiz approved."));
    }

    /// <summary>School, campus, or portal admin rejects a teacher quiz; reason required.</summary>
    [HttpPost("{quizId:long}/reject")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<RejectQuizResponse>>> RejectAsync(
        long quizId,
        [FromBody] RejectQuizRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _quizManageService.RejectAsync(quizId, request, cancellationToken);
        return Ok(ApiResponse<RejectQuizResponse>.Ok(response, "Quiz rejected."));
    }
}
