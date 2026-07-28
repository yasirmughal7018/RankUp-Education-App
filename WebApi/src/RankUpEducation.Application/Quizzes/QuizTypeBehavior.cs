using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Quizzes;

/// <summary>
/// Type-specific behavioral defaults and soft enforcement for Practice / Assessment /
/// Competition / Surprise / ParentPrivate quizzes.
/// </summary>
public static class QuizTypeBehavior
{
    public sealed record TypeDefaults(
        short? AllowedAttempts,
        short? TimeLimitMinutes,
        bool ShuffleQuestions,
        bool ShuffleOptions,
        bool IsReviewRequired,
        string NavigationMode,
        string ReviewDisplayMode);

    public static TypeDefaults ResolveDefaults(string quizTypeName)
    {
        var name = quizTypeName.Trim();
        if (name.Equals("Practice", StringComparison.OrdinalIgnoreCase))
        {
            return new TypeDefaults(3, null, false, false, false, "Free", QuizReviewDisplay.Full);
        }

        if (name.Equals("Competition", StringComparison.OrdinalIgnoreCase))
        {
            return new TypeDefaults(1, 30, true, true, false, "Locked", QuizReviewDisplay.Withheld);
        }

        if (name.Equals("Surprise", StringComparison.OrdinalIgnoreCase))
        {
            return new TypeDefaults(1, 15, true, true, false, "Sequential", QuizReviewDisplay.Withheld);
        }

        if (name.Equals("ParentPrivate", StringComparison.OrdinalIgnoreCase)
            || name.Equals("Parent Private", StringComparison.OrdinalIgnoreCase))
        {
            return new TypeDefaults(2, 30, false, false, true, "Free", QuizReviewDisplay.CorrectAnswers);
        }

        // Assessment (default school type)
        return new TypeDefaults(1, 45, false, true, true, "Free", QuizReviewDisplay.ScoreOnly);
    }

    /// <summary>
    /// Applies type defaults for nullable create fields (time limit, attempts, navigation, review display).
    /// Explicit bool choices from the client are preserved — never OR'd with type defaults.
    /// </summary>
    public static void ApplyCreateDefaults(
        Quiz quiz,
        string quizTypeName,
        string? requestedNavigationMode,
        string? requestedReviewDisplayMode = null)
    {
        var defaults = ResolveDefaults(quizTypeName);
        var navigation = string.IsNullOrWhiteSpace(requestedNavigationMode)
            ? defaults.NavigationMode
            : requestedNavigationMode;
        var reviewDisplay = string.IsNullOrWhiteSpace(requestedReviewDisplayMode)
            ? defaults.ReviewDisplayMode
            : requestedReviewDisplayMode;

        quiz.UpdateDetails(
            quiz.QuizTitle,
            quiz.Description,
            quiz.ClassId,
            quiz.SubjectId,
            quiz.TopicId,
            quiz.DifficultyLevelId,
            quiz.Instructions,
            quiz.TimeLimitMinutes ?? defaults.TimeLimitMinutes,
            quiz.AllowedAttempts ?? defaults.AllowedAttempts,
            quiz.ShuffleQuestions,
            quiz.ShuffleOptions,
            quiz.IsReviewRequired,
            navigation,
            reviewDisplay);
    }

    public static void EnsureAssignable(
        string quizTypeName,
        short? timeLimitMinutes,
        short allowedAttempts,
        DateTimeOffset startAt,
        DateTimeOffset endAt)
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

        if (name.Equals("Surprise", StringComparison.OrdinalIgnoreCase))
        {
            if (endAt - startAt > TimeSpan.FromHours(24))
            {
                throw new BusinessRuleException("Surprise quizzes must use an availability window of 24 hours or less.");
            }

            if (allowedAttempts > 1)
            {
                throw new BusinessRuleException("Surprise quizzes allow at most one attempt.");
            }
        }
    }
}
