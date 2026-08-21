namespace RankUpEducation.Application.Quizzes;

/// <summary>Validation rules for student file-upload answers during attempts.</summary>
public static class QuizAttemptFileUpload
{
    public const long MaxBytes = 10 * 1024 * 1024;

    public static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf",
        ".doc",
        ".docx",
        ".txt",
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".gif",
        ".zip",
    };
}
