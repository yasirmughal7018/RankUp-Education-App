namespace RankUpEducation.Application.Quizzes;

internal static class QuizStatusCalculator
{
    public static string ResolveListStatus(
        DateTimeOffset now,
        DateTimeOffset? startAt,
        DateTimeOffset? endAt,
        int attemptCount,
        int attemptLimit,
        DateTimeOffset? lastSubmittedAt)
    {
        if (startAt is not null && now < startAt.Value)
        {
            return "upcoming";
        }

        if (attemptCount >= attemptLimit && lastSubmittedAt is not null)
        {
            return "completed";
        }

        if (endAt is not null && now > endAt.Value)
        {
            return attemptCount > 0 ? "completed" : "completed";
        }

        if (attemptCount == 0)
        {
            return "assigned";
        }

        if (attemptCount < attemptLimit)
        {
            return "available";
        }

        return "completed";
    }

    public static string ResolveResultStatus(int attemptCount, int attemptLimit, short? bestPercentage, DateTimeOffset? lastSubmittedAt)
    {
        if (attemptCount == 0 || lastSubmittedAt is null)
        {
            return "Not Started";
        }

        if (attemptCount < attemptLimit)
        {
            return bestPercentage is null ? "In Progress" : "Submitted";
        }

        return bestPercentage is null ? "Submitted" : "Completed";
    }

    public static IReadOnlyList<string> ParseInstructions(string instructions)
    {
        if (string.IsNullOrWhiteSpace(instructions))
        {
            return Array.Empty<string>();
        }

        return instructions
            .Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToArray();
    }
}
