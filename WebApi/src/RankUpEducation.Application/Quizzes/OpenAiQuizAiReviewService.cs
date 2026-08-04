using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace RankUpEducation.Application.Quizzes;

/// <summary>
/// OpenAI Chat Completions grading for fill answers. Falls back to heuristic when disabled or on failure.
/// </summary>
public sealed class OpenAiQuizAiReviewService : IQuizAiReviewService
{
    private readonly HttpClient _httpClient;
    private readonly QuizAiOptions _options;
    private readonly IQuizAiReviewService _fallback;
    private readonly ILogger<OpenAiQuizAiReviewService> _logger;

    public OpenAiQuizAiReviewService(
        HttpClient httpClient,
        IOptions<QuizAiOptions> options,
        HeuristicQuizAiReviewService fallback,
        ILogger<OpenAiQuizAiReviewService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _fallback = fallback;
        _logger = logger;
    }

    public async Task<QuizAiReviewSuggestion> SuggestAsync(
        QuizAiReviewRequest request,
        CancellationToken cancellationToken)
    {
        if (!_options.Enabled || string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            return await _fallback.SuggestAsync(request, cancellationToken);
        }

        try
        {
            using var message = new HttpRequestMessage(
                HttpMethod.Post,
                $"{_options.BaseUrl.TrimEnd('/')}/chat/completions");
            message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);

            var accepted = string.Join("; ", request.AcceptedAnswers);
            var systemPrompt =
                "You grade short fill-in-the-blank student answers. "
                + "Respond with JSON only: {\"isCorrect\":bool,\"suggestedMarks\":number,\"feedback\":string}. "
                + $"suggestedMarks must be between 0 and {request.MaxMarks}.";
            var userPrompt =
                $"Question: {request.QuestionText}\n"
                + $"Accepted answers: {accepted}\n"
                + $"Student answer: {request.SubmittedText}\n"
                + $"Auto-score hint: {(request.AutoScoreIsCorrect ? "correct" : "incorrect")} "
                + $"({request.AutoAwardedMarks}/{request.MaxMarks}).";

            message.Content = JsonContent.Create(new
            {
                model = _options.Model,
                temperature = 0,
                response_format = new { type = "json_object" },
                messages = new object[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = userPrompt }
                }
            });

            using var response = await _httpClient.SendAsync(message, cancellationToken);
            response.EnsureSuccessStatusCode();
            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            var content = document.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            if (string.IsNullOrWhiteSpace(content))
            {
                return await _fallback.SuggestAsync(request, cancellationToken);
            }

            using var payload = JsonDocument.Parse(content);
            var root = payload.RootElement;
            var isCorrect = root.TryGetProperty("isCorrect", out var correctEl) && correctEl.GetBoolean();
            var suggested = root.TryGetProperty("suggestedMarks", out var marksEl)
                ? (short)Math.Clamp(marksEl.GetInt32(), 0, request.MaxMarks)
                : request.AutoAwardedMarks;
            var feedback = root.TryGetProperty("feedback", out var feedbackEl)
                ? feedbackEl.GetString() ?? "AI graded answer."
                : "AI graded answer.";

            return new QuizAiReviewSuggestion(isCorrect, suggested, $"OpenAI: {feedback}");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "OpenAI quiz AI review failed; using heuristic fallback.");
            return await _fallback.SuggestAsync(request, cancellationToken);
        }
    }
}
