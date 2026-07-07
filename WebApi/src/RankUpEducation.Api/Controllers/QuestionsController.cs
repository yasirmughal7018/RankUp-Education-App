using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Application.Questions;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.Questions;
using RankUpEducation.Contracts.Quizzes;

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

    /// <summary>Lists all questions linked to a quiz (parent/teacher owner only).</summary>
    [HttpGet("quiz/{quizId:long}")]
    public async Task<ActionResult<ApiResponse<QuizQuestionListResponse>>> ListForQuizAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var response = await _questionService.ListForQuizAsync(quizId, cancellationToken);
        return Ok(ApiResponse<QuizQuestionListResponse>.Ok(response));
    }

    /// <summary>Adds a question to a quiz and returns the updated quiz manage view.</summary>
    [HttpPost("quiz/{quizId:long}")]
    public async Task<ActionResult<ApiResponse<ManageQuizResponse>>> AddToQuizAsync(
        long quizId,
        [FromBody] AddQuizQuestionRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _questionService.AddToQuizAsync(quizId, request, cancellationToken);
        return Ok(ApiResponse<ManageQuizResponse>.Ok(response, "Question added."));
    }

    /// <summary>Updates a question on a quiz and returns the updated quiz manage view.</summary>
    [HttpPut("quiz/{quizId:long}/{questionId:long}")]
    public async Task<ActionResult<ApiResponse<ManageQuizResponse>>> UpdateOnQuizAsync(
        long quizId,
        long questionId,
        [FromBody] UpdateQuizQuestionRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _questionService.UpdateOnQuizAsync(quizId, questionId, request, cancellationToken);
        return Ok(ApiResponse<ManageQuizResponse>.Ok(response, "Question updated."));
    }

    /// <summary>Removes a question from a quiz and returns the updated quiz manage view.</summary>
    [HttpDelete("quiz/{quizId:long}/{questionId:long}")]
    public async Task<ActionResult<ApiResponse<ManageQuizResponse>>> RemoveFromQuizAsync(
        long quizId,
        long questionId,
        CancellationToken cancellationToken)
    {
        var response = await _questionService.RemoveFromQuizAsync(quizId, questionId, cancellationToken);
        return Ok(ApiResponse<ManageQuizResponse>.Ok(response, "Question removed."));
    }
}
