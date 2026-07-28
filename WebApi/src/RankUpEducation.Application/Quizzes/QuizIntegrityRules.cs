using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Quizzes;

/// <summary>Competition integrity thresholds beyond device lock (focus / paste telemetry).</summary>
public static class QuizIntegrityRules
{
    public const short CompetitionMaxFocusLoss = 5;
    public const short CompetitionMaxClipboardPaste = 3;

    public static bool IsCompetitionBreached(QuizAttempt attempt)
        => attempt.FocusLossCount >= CompetitionMaxFocusLoss
            || attempt.ClipboardPasteCount >= CompetitionMaxClipboardPaste;

    /// <summary>
    /// Blocks further draft answer changes once Competition integrity limits are exceeded.
    /// Submit remains allowed so the student can finish.
    /// </summary>
    public static void EnsureCompetitionDraftAllowed(string quizTypeName, QuizAttempt attempt)
    {
        if (!quizTypeName.Equals("Competition", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        if (IsCompetitionBreached(attempt))
        {
            throw new BusinessRuleException(
                "Competition integrity limit exceeded (too many focus losses or paste events). Submit your attempt now.");
        }
    }
}
