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

    public QuizzesController(IQuizService quizService)
    {
        _quizService = quizService;
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
        return Ok(ApiResponse<StartQuizAttemptResponse>.Ok(response, "Quiz attempt started."));
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
}
