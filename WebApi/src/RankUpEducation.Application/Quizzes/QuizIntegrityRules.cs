using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Quizzes;

/// <summary>Attempt integrity thresholds beyond Competition device lock (focus / paste telemetry).</summary>
public static class QuizIntegrityRules
{
    public const short MaxFocusLoss = 5;
    public const short MaxClipboardPaste = 3;

    public static bool IsBreached(QuizAttempt attempt)
        => attempt.FocusLossCount >= MaxFocusLoss
            || attempt.ClipboardPasteCount >= MaxClipboardPaste;

    /// <summary>Backward-compatible alias for <see cref="IsBreached"/>.</summary>
    public static bool IsCompetitionBreached(QuizAttempt attempt) => IsBreached(attempt);

    /// <summary>
    /// Blocks further draft answer changes once focus/paste integrity limits are exceeded.
    /// Submit remains allowed so the student can finish. Applies to all quiz types.
    /// </summary>
    public static void EnsureDraftAllowed(QuizAttempt attempt)
    {
        if (IsBreached(attempt))
        {
            throw new BusinessRuleException(
                "Integrity limit exceeded (too many focus losses or paste events). Submit your attempt now.");
        }
    }

    /// <summary>Backward-compatible alias; quiz type is ignored (lockout is type-agnostic).</summary>
    public static void EnsureCompetitionDraftAllowed(string quizTypeName, QuizAttempt attempt)
        => EnsureDraftAllowed(attempt);
}
