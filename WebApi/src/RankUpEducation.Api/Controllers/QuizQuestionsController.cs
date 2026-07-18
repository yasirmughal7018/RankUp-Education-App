using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Application.QuizQuestions;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.QuizQuestions;
using RankUpEducation.Contracts.Quizzes;

namespace RankUpEducation.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/quizzes/{quizId:long}/questions")]
public sealed class QuizQuestionsController : ControllerBase
{
    private readonly IQuizQuestionService _quizQuestionService;

    public QuizQuestionsController(IQuizQuestionService quizQuestionService)
    {
        _quizQuestionService = quizQuestionService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<QuizQuestionListResponse>>> ListAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var response = await _quizQuestionService.ListForQuizAsync(quizId, cancellationToken);
        return Ok(ApiResponse<QuizQuestionListResponse>.Ok(response));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ManageQuizResponse>>> AddAsync(
        long quizId,
        [FromBody] AddQuizQuestionRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _quizQuestionService.AddToQuizAsync(quizId, request, cancellationToken);
        return Ok(ApiResponse<ManageQuizResponse>.Ok(response, "Question added."));
    }

    [HttpPost("from-bank")]
    public async Task<ActionResult<ApiResponse<ManageQuizResponse>>> AttachFromBankAsync(
        long quizId,
        [FromBody] AttachBankQuestionRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _quizQuestionService.AttachBankQuestionAsync(
            quizId,
            request,
            cancellationToken);
        return Ok(ApiResponse<ManageQuizResponse>.Ok(response, "Question attached from bank."));
    }

    [HttpPut("{questionId:long}")]
    public async Task<ActionResult<ApiResponse<ManageQuizResponse>>> UpdateAsync(
        long quizId,
        long questionId,
        [FromBody] UpdateQuizQuestionRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _quizQuestionService.UpdateOnQuizAsync(
            quizId,
            questionId,
            request,
            cancellationToken);
        return Ok(ApiResponse<ManageQuizResponse>.Ok(response, "Question updated."));
    }

    [HttpDelete("{questionId:long}")]
    public async Task<ActionResult<ApiResponse<ManageQuizResponse>>> RemoveAsync(
        long quizId,
        long questionId,
        CancellationToken cancellationToken)
    {
        var response = await _quizQuestionService.RemoveFromQuizAsync(quizId, questionId, cancellationToken);
        return Ok(ApiResponse<ManageQuizResponse>.Ok(response, "Question removed."));
    }
}
