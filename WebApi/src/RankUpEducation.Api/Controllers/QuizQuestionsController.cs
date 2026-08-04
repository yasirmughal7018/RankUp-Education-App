using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Application.QuizQuestions;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.QuizQuestions;
using RankUpEducation.Contracts.Quizzes;

namespace RankUpEducation.Api.Controllers;

/// <summary>Inline and bank question attach endpoints for quiz authoring.</summary>
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

    /// <summary>Lists questions on a quiz (manage view).</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<QuizQuestionListResponse>>> ListAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var response = await _quizQuestionService.ListForQuizAsync(quizId, cancellationToken);
        return Ok(ApiResponse<QuizQuestionListResponse>.Ok(response));
    }

    /// <summary>Creates an inline question and attaches it to the quiz.</summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<ManageQuizResponse>>> AddAsync(
        long quizId,
        [FromBody] AddQuizQuestionRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _quizQuestionService.AddToQuizAsync(quizId, request, cancellationToken);
        return Ok(ApiResponse<ManageQuizResponse>.Ok(response, "Question added."));
    }

    /// <summary>Attaches an approved question-bank item to the quiz.</summary>
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

    /// <summary>Updates an inline question on the quiz.</summary>
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

    /// <summary>Removes a question from the quiz.</summary>
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
