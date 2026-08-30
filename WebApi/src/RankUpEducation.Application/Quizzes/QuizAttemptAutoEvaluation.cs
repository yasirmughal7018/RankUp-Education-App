using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Questions;

namespace RankUpEducation.Application.Quizzes;

/// <summary>Objective auto-score for one attempt question (submit or overdue close).</summary>
public readonly record struct QuizAutoEvaluationResult(
    bool IsCorrect,
    short AwardedMarks,
    bool HasSubjectiveAnswers,
    bool NeedsAiReview,
    FillBlankEvaluation? FillResult);

/// <summary>
/// Single auto-evaluation path for Multiple Choice, Match, Order, Single/TF,
/// Fill in the Blanks, and Essay. Callers persist the result; do not duplicate this.
/// </summary>
public static class QuizAttemptAutoEvaluation
{
    public static QuizAutoEvaluationResult Evaluate(
        string questionTypeName,
        short marks,
        IReadOnlyList<long> selectedOptionIds,
        string? submittedText,
        IReadOnlyList<QuizQuestionOptionItem> options,
        IReadOnlyList<QuestionAcceptedAnswerScoreItem> acceptedAnswers)
    {
        var typeName = questionTypeName ?? string.Empty;
        var selectedAligned = (selectedOptionIds ?? [])
            .Select(id => id > 0 ? id : 0L)
            .ToArray();
        var selected = selectedAligned.Where(id => id > 0).Distinct().ToArray();
        var text = submittedText.AsTrimmedOrNull();
        var optionItems = options ?? [];
        var accepted = acceptedAnswers ?? [];

        var isFillBlank = QuizQuestionHelper.IsFillBlankType(typeName);
        var isMatching = QuizQuestionHelper.IsMatchingType(typeName);
        var isOrdering = QuizQuestionHelper.IsOrderingType(typeName);
        var isMultiSelect = QuizQuestionHelper.IsMultiSelectType(typeName);
        var isFileUpload = QuizQuestionHelper.IsFileUploadType(typeName);
        var isDescriptive = QuizQuestionHelper.IsDescriptiveType(typeName) || isFileUpload;

        if (isMatching)
        {
            var orderedOptions = optionItems.ToArray();
            if (orderedOptions.Length >= 4 && orderedOptions.Length % 2 == 0)
            {
                var half = orderedOptions.Length / 2;
                var correctRights = orderedOptions.Skip(half).Select(option => option.OptionId).ToArray();
                var matchScore = QuizAnswerSelection.ScoreMatching(selectedAligned, correctRights, marks);
                return new QuizAutoEvaluationResult(
                    matchScore.IsFullyCorrect,
                    matchScore.AwardedMarks,
                    HasSubjectiveAnswers: false,
                    NeedsAiReview: false,
                    FillResult: null);
            }

            return new QuizAutoEvaluationResult(false, 0, false, false, null);
        }

        if (isOrdering)
        {
            var correctOrder = optionItems.Select(option => option.OptionId).ToArray();
            var orderScore = QuizAnswerSelection.ScoreOrdering(selectedAligned, correctOrder, marks);
            return new QuizAutoEvaluationResult(
                orderScore.IsFullyCorrect,
                orderScore.AwardedMarks,
                false,
                false,
                null);
        }

        if (isMultiSelect && selected.Length > 0)
        {
            var correctOptionIds = optionItems
                .Where(option => option.IsCorrect)
                .Select(option => option.OptionId)
                .ToArray();
            var multiScore = QuizAnswerSelection.ScoreMultiSelect(selected, correctOptionIds, marks);
            return new QuizAutoEvaluationResult(
                multiScore.IsFullyCorrect,
                multiScore.AwardedMarks,
                false,
                false,
                null);
        }

        if (isFillBlank && text.HasTrimmedText())
        {
            var fillResult = FillBlankAnswerMatching.Evaluate(
                text,
                accepted.Select(answer => new FillBlankAcceptedAnswer(
                    answer.AnswerText,
                    answer.IsCaseSensitive,
                    answer.AllowPartialMatch,
                    answer.MinimumLength,
                    answer.MaximumLength,
                    answer.AllowAiReview,
                    answer.AllowTeacherReview)));
            return new QuizAutoEvaluationResult(
                fillResult.IsFullyCorrect,
                fillResult.IsFullyCorrect ? marks : (short)0,
                fillResult.NeedsTeacherReview,
                fillResult.NeedsAiReview,
                fillResult);
        }

        if (selected.Length > 0 && !isFillBlank && !isDescriptive)
        {
            var selectedOption = optionItems.FirstOrDefault(option => option.OptionId == selected[0]);
            var isCorrect = selectedOption?.IsCorrect ?? false;
            return new QuizAutoEvaluationResult(
                isCorrect,
                isCorrect ? marks : (short)0,
                false,
                false,
                null);
        }

        if (isDescriptive && text.HasTrimmedText())
        {
            return new QuizAutoEvaluationResult(
                IsCorrect: false,
                AwardedMarks: 0,
                HasSubjectiveAnswers: true,
                NeedsAiReview: QuizQuestionHelper.IsDescriptiveType(typeName),
                FillResult: null);
        }

        return new QuizAutoEvaluationResult(false, 0, false, false, null);
    }
}
