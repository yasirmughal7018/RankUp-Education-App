using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Quizzes;

/// <summary>
/// Type-specific behavioral defaults and enforcement for Practice / Assessment /
/// Competition / Surprise quizzes.
/// </summary>
public static class QuizTypeBehavior
{
    /// <summary>Maximum Surprise availability window (End − Start).</summary>
    public static readonly TimeSpan SurpriseMaxAvailabilityWindow = TimeSpan.FromHours(24);

    /// <summary>Maximum how far ahead a Surprise StartAt may be scheduled from now.</summary>
    public static readonly TimeSpan SurpriseMaxAdvanceNotice = TimeSpan.FromHours(24);

    public sealed record TypeDefaults(
        short? AllowedAttempts,
        short? TimeLimitMinutes,
        bool ShuffleQuestions,
        bool ShuffleOptions,
        bool IsReviewRequired,
        string NavigationMode);

    public static bool IsSurprise(string? quizTypeName)
        => !string.IsNullOrWhiteSpace(quizTypeName)
           && quizTypeName.Trim().Equals("Surprise", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Surprise quizzes must not appear to students before the assignment window opens
    /// (no advance notice in list/detail).
    /// </summary>
    public static bool IsHiddenFromStudentUntilStart(
        string? quizTypeName,
        DateTimeOffset startAt,
        DateTimeOffset now)
        => IsSurprise(quizTypeName) && startAt > now;

    public static TypeDefaults ResolveDefaults(string quizTypeName)
    {
        var name = quizTypeName.Trim();
        if (name.Equals("Practice", StringComparison.OrdinalIgnoreCase))
        {
            return new TypeDefaults(3, null, false, false, false, "Free");
        }

        if (name.Equals("Competition", StringComparison.OrdinalIgnoreCase))
        {
            return new TypeDefaults(1, 30, true, true, false, "Locked");
        }

        if (IsSurprise(name))
        {
            return new TypeDefaults(1, 15, true, true, false, "Sequential");
        }

        // Assessment (default school type)
        return new TypeDefaults(1, 45, false, true, true, "Free");
    }

    /// <summary>
    /// Applies type defaults for nullable create fields (attempts, navigation).
    /// Review display is always Full. Time limit stays null until questions are added.
    /// Explicit bool choices from the client are preserved.
    /// </summary>
    public static void ApplyCreateDefaults(
        Quiz quiz,
        string quizTypeName,
        string? requestedNavigationMode,
        string? requestedReviewDisplayMode = null)
    {
        _ = requestedReviewDisplayMode;
        var defaults = ResolveDefaults(quizTypeName);
        var navigation = string.IsNullOrWhiteSpace(requestedNavigationMode)
            ? defaults.NavigationMode
            : requestedNavigationMode;

        quiz.UpdateDetails(
            quiz.QuizTitle,
            quiz.Description,
            quiz.ClassId,
            quiz.SubjectId,
            quiz.TopicId,
            quiz.DifficultyLevelId,
            quiz.Instructions,
            quiz.TimeLimitMinutes,
            quiz.AllowedAttempts ?? defaults.AllowedAttempts,
            quiz.ShuffleQuestions,
            quiz.ShuffleOptions,
            quiz.IsReviewRequired,
            navigation,
            QuizReviewDisplay.Full);
    }

    public static void EnsureAssignable(
        string quizTypeName,
        short? timeLimitMinutes,
        short allowedAttempts,
        DateTimeOffset startAt,
        DateTimeOffset endAt,
        DateTimeOffset now)
    {
        var name = quizTypeName.Trim();

        if (name.Equals("Competition", StringComparison.OrdinalIgnoreCase))
        {
            if (timeLimitMinutes is null or <= 0)
            {
                throw new BusinessRuleException("Competition quizzes require a time limit.");
            }

            if (allowedAttempts != 1)
            {
                throw new BusinessRuleException("Competition quizzes allow exactly one attempt.");
            }
        }

        if (IsSurprise(name))
        {
            if (endAt - startAt > SurpriseMaxAvailabilityWindow)
            {
                throw new BusinessRuleException(
                    "Surprise quizzes must use an availability window of 24 hours or less.");
            }

            if (startAt - now > SurpriseMaxAdvanceNotice)
            {
                throw new BusinessRuleException(
                    "Surprise quizzes cannot be scheduled more than 24 hours in advance.");
            }

            if (allowedAttempts > 1)
            {
                throw new BusinessRuleException("Surprise quizzes allow at most one attempt.");
            }
        }
    }
}
