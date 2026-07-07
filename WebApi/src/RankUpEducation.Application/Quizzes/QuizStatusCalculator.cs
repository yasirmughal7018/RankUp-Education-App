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

    public static string ResolveMonitorStatus(
        DateTimeOffset now,
        DateTimeOffset startAt,
        DateTimeOffset endAt,
        int attemptCount,
        bool isReviewDone,
        DateTimeOffset? lastSubmittedAt)
    {
        if (lastSubmittedAt is not null && !isReviewDone)
        {
            return "pending_review";
        }

        if (isReviewDone)
        {
            return "reviewed";
        }

        if (attemptCount == 0 && now < startAt)
        {
            return "upcoming";
        }

        if (attemptCount == 0)
        {
            return "not_started";
        }

        if (now <= endAt)
        {
            return "in_progress";
        }

        return "completed";
    }
}
