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
        var isMcq = QuizQuestionHelper.IsMcqType(questionTypeName)
            || QuizQuestionHelper.IsMultiSelectType(questionTypeName)
            || options.Length > 0;

        if (!isMcq)
        {
            return;
        }

        if (options.Length < 2)
        {
            throw new BusinessRuleException("AI approval requires MCQ questions to have at least 2 options.");
        }

        var correctCount = options.Count(option => option.IsCorrect);
        if (QuizQuestionHelper.IsMultiSelectType(questionTypeName))
        {
            if (correctCount < 1)
            {
                throw new BusinessRuleException(
                    "AI approval requires multi-select questions to have at least one correct option.");
            }

            return;
        }

        if (correctCount != 1)
        {
            throw new BusinessRuleException(
                "AI approval requires MCQ questions to have exactly one correct option.");
        }
    }
}
