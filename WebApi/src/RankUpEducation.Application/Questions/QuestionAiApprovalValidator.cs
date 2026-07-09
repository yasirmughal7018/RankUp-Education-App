using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Questions;

namespace RankUpEducation.Application.Questions;

/// <summary>
/// Heuristic checks for the AI-approval marker path (not external LLM scoring).
/// </summary>
public static class QuestionAiApprovalValidator
{
    public static void EnsureReadyForAiApproval(Question question, string questionTypeName)
    {
        if (string.IsNullOrWhiteSpace(question.QuestionText))
        {
            throw new BusinessRuleException("AI approval requires non-empty question text.");
        }

        var options = question.Options.Where(option => option.IsActive).ToArray();

        if (QuizQuestionHelper.IsDescriptiveType(questionTypeName))
        {
            return;
        }

        if (QuizQuestionHelper.IsFillBlankType(questionTypeName))
        {
            if (options.Length < 1 || options.All(option => string.IsNullOrWhiteSpace(option.OptionText)))
            {
                throw new BusinessRuleException(
                    "AI approval requires fill-in-the-blank questions to have at least one accepted answer.");
            }

            return;
        }

        if (!QuizQuestionHelper.UsesOptions(questionTypeName) && options.Length == 0)
        {
            return;
        }

        if (options.Length < 2)
        {
            throw new BusinessRuleException(
                "AI approval requires choice questions to have at least 2 options.");
        }

        var correctCount = options.Count(option => option.IsCorrect);
        if (QuizQuestionHelper.IsMultiSelectType(questionTypeName))
        {
            if (correctCount < 1)
            {
                throw new BusinessRuleException(
                    "AI approval requires multiple-choice questions to have at least one correct option.");
            }

            return;
        }

        if (correctCount != 1)
        {
            throw new BusinessRuleException(
                "AI approval requires single-choice / true-false questions to have exactly one correct option.");
        }
    }
}
