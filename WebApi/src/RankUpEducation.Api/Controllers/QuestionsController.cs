using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

    [HttpPut("{questionId:long}")]
    public async Task<ActionResult<ApiResponse<QuestionDetailResponse>>> UpdateAsync(
        long questionId,
        [FromBody] UpdateQuestionRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _questionService.UpdateAsync(questionId, request, cancellationToken);
        return Ok(ApiResponse<QuestionDetailResponse>.Ok(response, "Question updated."));
    }

    [HttpPost("{questionId:long}/approve")]
    public async Task<ActionResult<ApiResponse<QuestionApprovalResponse>>> ApproveAsync(
        long questionId,
        CancellationToken cancellationToken)
    {
        var response = await _questionService.ApproveAsync(questionId, cancellationToken);
        return Ok(ApiResponse<QuestionApprovalResponse>.Ok(response, "Question approved."));
    }

    [HttpPost("{questionId:long}/approve-ai")]
    public async Task<ActionResult<ApiResponse<QuestionApprovalResponse>>> ApproveAiAsync(
        long questionId,
        CancellationToken cancellationToken)
    {
        var response = await _questionService.ApproveAiAsync(questionId, cancellationToken);
        return Ok(ApiResponse<QuestionApprovalResponse>.Ok(
            response,
            "Question marked AI-approved after heuristic validation (not LLM scoring)."));
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

    [HttpDelete("{questionId:long}")]
    public async Task<ActionResult<ApiResponse<DeleteQuestionResponse>>> DeleteAsync(
        long questionId,
        CancellationToken cancellationToken)
    {
        var response = await _questionService.DeleteAsync(questionId, cancellationToken);
        return Ok(ApiResponse<DeleteQuestionResponse>.Ok(response, "Question deleted."));
    }
}
