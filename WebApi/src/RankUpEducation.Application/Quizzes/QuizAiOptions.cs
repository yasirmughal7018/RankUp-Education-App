namespace RankUpEducation.Application.Quizzes;

/// <summary>Configuration for optional OpenAI-backed fill-answer AI review.</summary>
public sealed class QuizAiOptions
{
    public const string SectionName = "QuizAi";

    /// <summary>When true and ApiKey is set, OpenAI is used; otherwise heuristic fallback runs.</summary>
    public bool Enabled { get; set; }

    public string Provider { get; set; } = "OpenAI";

    public string ApiKey { get; set; } = string.Empty;

    public string Model { get; set; } = "gpt-4o-mini";

    public string BaseUrl { get; set; } = "https://api.openai.com/v1";
}
