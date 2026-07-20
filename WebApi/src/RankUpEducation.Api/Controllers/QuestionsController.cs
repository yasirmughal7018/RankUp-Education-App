using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Questions;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.Questions;

namespace RankUpEducation.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/questions")]
public sealed class QuestionsController : ControllerBase
{
    private readonly IQuestionService _questionService;

    public QuestionsController(IQuestionService questionService)
    {
        _questionService = questionService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<QuestionListResponse>>> ListAsync(
        [FromQuery] bool? isActive,
        [FromQuery] short? subjectId,
        [FromQuery] short? classId,
        [FromQuery] bool pendingApprovalOnly = false,
        [FromQuery] bool eligibleForQuizOnly = false,
        CancellationToken cancellationToken = default)
    {
        var response = await _questionService.ListAsync(
            isActive,
            subjectId,
            classId,
            pendingApprovalOnly,
            eligibleForQuizOnly,
            cancellationToken);
        return Ok(ApiResponse<QuestionListResponse>.Ok(response));
    }

    [HttpGet("pending-approval")]
    public async Task<ActionResult<ApiResponse<QuestionListResponse>>> ListPendingApprovalAsync(
        CancellationToken cancellationToken)
    {
        var response = await _questionService.ListPendingApprovalAsync(cancellationToken);
        return Ok(ApiResponse<QuestionListResponse>.Ok(response));
    }

    [HttpGet("import-template")]
    public IActionResult DownloadImportTemplate()
    {
        var bytes = QuestionExcelImportParser.BuildTemplate();
        return File(
            bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "rankup-questions-import-template.xlsx");
    }

    [HttpGet("{questionId:long}")]
    public async Task<ActionResult<ApiResponse<QuestionDetailResponse>>> GetByIdAsync(
        long questionId,
        CancellationToken cancellationToken)
    {
        var response = await _questionService.GetByIdAsync(questionId, cancellationToken);
        return Ok(ApiResponse<QuestionDetailResponse>.Ok(response));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<QuestionDetailResponse>>> CreateAsync(
        [FromBody] CreateQuestionRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _questionService.CreateAsync(request, cancellationToken);
        return Ok(ApiResponse<QuestionDetailResponse>.Ok(response, "Question created."));
    }

    [HttpPost("import")]
    [RequestSizeLimit(10_000_000)]
    public async Task<ActionResult<ApiResponse<ImportQuestionsResponse>>> ImportAsync(
        IFormFile file,
        [FromQuery] bool dryRun = false,
        CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0)
        {
            throw new ValidationAppException(["Excel file is required."]);
        }

        await using var stream = file.OpenReadStream();
        IReadOnlyList<QuestionExcelImportRow> rows;
        try
        {
            rows = QuestionExcelImportParser.Parse(stream);
        }
        catch (Exception ex)
        {
            throw new ValidationAppException([$"Unable to read Excel file: {ex.Message}"]);
        }

        var response = await _questionService.ImportAsync(rows, dryRun, cancellationToken);
        var message = dryRun
            ? $"Dry run complete. {response.ErrorCount} row error(s)."
            : $"Imported {response.CreatedCount} question(s). {response.ErrorCount} row error(s).";
        return Ok(ApiResponse<ImportQuestionsResponse>.Ok(response, message));
    }

    [HttpPut("{questionId:long}")]
    public async Task<ActionResult<ApiResponse<QuestionDetailResponse>>> UpdateAsync(
        long questionId,
        [FromBody] UpdateQuestionRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _questionService.UpdateAsync(questionId, request, cancellationToken);
        return Ok(ApiResponse<QuestionDetailResponse>.Ok(response, "Question updated."));
    }

    [HttpPost("{questionId:long}/submit")]
    public async Task<ActionResult<ApiResponse<QuestionDetailResponse>>> SubmitForReviewAsync(
        long questionId,
        CancellationToken cancellationToken)
    {
        var response = await _questionService.SubmitForReviewAsync(questionId, cancellationToken);
        return Ok(ApiResponse<QuestionDetailResponse>.Ok(response, "Question submitted for Portal Admin review."));
    }

    [HttpPost("{questionId:long}/approve")]
    public async Task<ActionResult<ApiResponse<QuestionApprovalResponse>>> ApproveAsync(
        long questionId,
        CancellationToken cancellationToken)
    {
        var response = await _questionService.ApproveAsync(questionId, cancellationToken);
        return Ok(ApiResponse<QuestionApprovalResponse>.Ok(response, "Question approved."));
    }

    [HttpPost("{questionId:long}/reject")]
    public async Task<ActionResult<ApiResponse<QuestionApprovalResponse>>> RejectAsync(
        long questionId,
        [FromBody] RejectQuestionRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _questionService.RejectAsync(questionId, request, cancellationToken);
        return Ok(ApiResponse<QuestionApprovalResponse>.Ok(response, "Question rejected."));
    }

    [HttpPost("{questionId:long}/activate")]
    public async Task<ActionResult<ApiResponse<QuestionActiveStateResponse>>> ActivateAsync(
        long questionId,
        CancellationToken cancellationToken)
    {
        var response = await _questionService.ActivateAsync(questionId, cancellationToken);
        return Ok(ApiResponse<QuestionActiveStateResponse>.Ok(response, "Question activated."));
    }

    [HttpPost("{questionId:long}/deactivate")]
    public async Task<ActionResult<ApiResponse<QuestionActiveStateResponse>>> DeactivateAsync(
        long questionId,
        CancellationToken cancellationToken)
    {
        var response = await _questionService.DeactivateAsync(questionId, cancellationToken);
        return Ok(ApiResponse<QuestionActiveStateResponse>.Ok(response, "Question deactivated."));
    }

    [HttpPost("{questionId:long}/archive")]
    public async Task<ActionResult<ApiResponse<QuestionActiveStateResponse>>> ArchiveAsync(
        long questionId,
        CancellationToken cancellationToken)
    {
        var response = await _questionService.ArchiveAsync(questionId, cancellationToken);
        return Ok(ApiResponse<QuestionActiveStateResponse>.Ok(response, "Question archived."));
    }

    [HttpDelete("{questionId:long}")]
    public async Task<ActionResult<ApiResponse<DeleteQuestionResponse>>> DeleteAsync(
        long questionId,
        CancellationToken cancellationToken)
    {
        var response = await _questionService.DeleteAsync(questionId, cancellationToken);
        return Ok(ApiResponse<DeleteQuestionResponse>.Ok(response, "Question deleted."));
    }
}
