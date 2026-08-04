namespace RankUpEducation.Application.Quizzes;

/// <summary>
/// Grades subjective/fill answers with AI assistance.
/// Default implementation is a local heuristic scorer (no external provider);
/// replace with a real LLM/provider registration when configured.
/// </summary>
public interface IQuizAiReviewService
{
    Task<QuizAiReviewSuggestion> SuggestAsync(
        QuizAiReviewRequest request,
        CancellationToken cancellationToken);
}

public sealed record QuizAiReviewRequest(
    string QuestionText,
    string SubmittedText,
    bool AutoScoreIsCorrect,
    short AutoAwardedMarks,
    short MaxMarks,
    IReadOnlyList<string> AcceptedAnswers);

public sealed record QuizAiReviewSuggestion(
    bool IsCorrect,
    short SuggestedMarks,
    string Feedback);
