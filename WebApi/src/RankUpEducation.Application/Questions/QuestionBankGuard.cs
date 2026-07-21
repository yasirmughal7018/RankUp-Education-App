using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Contracts.Questions;

namespace RankUpEducation.Application.Questions;

/// <summary>
/// Validates question-bank payloads by type.
/// NOW types: Single Choice, Multiple Choice, True/False, Fill in the Blanks.
/// Descriptive and future types are rejected until enabled.
/// Fill answers use <see cref="QuestionAcceptedAnswerRequest"/>; choice types use options.
/// </summary>
internal static class QuestionBankGuard
{
    /// <summary>Validates create request text, marks, type, and answers/options.</summary>
    public static void ValidateCreateRequest(CreateQuestionRequest request)
    {
        ValidateCore(
            request.QuestionText,
            request.QuestionType,
            request.Marks,
            request.Options,
            request.AcceptedAnswers);
    }

    /// <summary>Validates update request text, marks, type, and answers/options.</summary>
    public static void ValidateUpdateRequest(UpdateQuestionRequest request)
    {
        ValidateCore(
            request.QuestionText,
            request.QuestionType,
            request.Marks,
            request.Options,
            request.AcceptedAnswers);
    }

    /// <summary>Shared create/update validation (does not check org or status).</summary>
    public static void ValidateCore(
        string questionText,
        string questionType,
        short marks,
        IReadOnlyList<QuestionOptionRequest> options,
        IReadOnlyList<QuestionAcceptedAnswerRequest>? acceptedAnswers)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(questionText))
        {
            errors.Add("Question text is required.");
        }

        if (marks <= 0)
        {
            errors.Add("Marks must be greater than zero.");
        }

        if (string.IsNullOrWhiteSpace(questionType))
        {
            errors.Add("Question type is required.");
        }
        else
        {
            errors.AddRange(ValidateTypeAndAnswers(questionType, options, acceptedAnswers));
        }

        if (errors.Count > 0)
        {
            throw new ValidationAppException(errors);
        }
    }

    /// <summary>Tuple overload used by quiz-inline and import helpers.</summary>
    public static IReadOnlyList<string> ValidateTypeAndAnswers(
        string questionType,
        IReadOnlyList<(string OptionText, bool IsCorrect)> options,
        IReadOnlyList<string> acceptedAnswerTexts)
    {
        var accepted = acceptedAnswerTexts
            .Where(text => !string.IsNullOrWhiteSpace(text))
            .Select(text => new QuestionAcceptedAnswerRequest(text.Trim()))
            .ToArray();

        var optionRequests = options
            .Select(option => new QuestionOptionRequest(option.OptionText, option.IsCorrect))
            .ToArray();

        return ValidateTypeAndAnswers(questionType, optionRequests, accepted);
    }

    /// <summary>Shared rules for bank and quiz-inline option payloads (choice types).</summary>
    public static IReadOnlyList<string> ValidateTypeAndOptions(
        string questionType,
        IReadOnlyList<(string OptionText, bool IsCorrect)> options)
        => ValidateTypeAndAnswers(questionType, options, Array.Empty<string>());

    /// <summary>
    /// Type-specific answer rules: Fill needs ≥1 accepted answer (options fallback for legacy);
    /// True/False exactly 2 options / 1 correct; Single ≥2 / 1 correct; Multi ≥2 / ≥1 correct.
    /// </summary>
    private static IReadOnlyList<string> ValidateTypeAndAnswers(
        string questionType,
        IReadOnlyList<QuestionOptionRequest> options,
        IReadOnlyList<QuestionAcceptedAnswerRequest>? acceptedAnswers)
    {
        var errors = new List<string>();
        var type = questionType.Trim();

        if (QuizQuestionHelper.IsDescriptiveType(type))
        {
            errors.Add(
                "Descriptive questions are not available yet. Use Single Choice, Multiple Choice, True/False, or Fill in the Blanks.");
            return errors;
        }

        var isSingle = QuizQuestionHelper.IsSingleChoiceType(type);
        var isMulti = QuizQuestionHelper.IsMultiSelectType(type);
        var isTrueFalse = QuizQuestionHelper.IsTrueFalseType(type);
        var isFill = QuizQuestionHelper.IsFillBlankType(type);

        if (!isSingle && !isMulti && !isTrueFalse && !isFill)
        {
            errors.Add(
                $"Question type '{questionType}' is not available yet. Use Single Choice, Multiple Choice, True/False, or Fill in the Blanks.");
            return errors;
        }

        if (isFill)
        {
            var filledAnswers = (acceptedAnswers ?? Array.Empty<QuestionAcceptedAnswerRequest>())
                .Where(answer => !string.IsNullOrWhiteSpace(answer.AnswerText))
                .ToArray();

            // Legacy import may still send Fill answers as options — accept either until UI is fully migrated.
            if (filledAnswers.Length == 0)
            {
                filledAnswers = options
                    .Where(option => !string.IsNullOrWhiteSpace(option.OptionText))
                    .Select(option => new QuestionAcceptedAnswerRequest(option.OptionText.Trim()))
                    .ToArray();
            }

            if (filledAnswers.Length < 1)
            {
                errors.Add("Fill in the Blanks requires at least one accepted answer.");
            }

            return errors;
        }

        var filled = options
            .Where(option => !string.IsNullOrWhiteSpace(option.OptionText))
            .Select(option => (Text: option.OptionText.Trim(), option.IsCorrect))
            .ToArray();

        var correctCount = filled.Count(option => option.IsCorrect);

        if (isTrueFalse)
        {
            if (filled.Length != 2)
            {
                errors.Add("True/False must have exactly two options (True and False).");
            }

            if (correctCount != 1)
            {
                errors.Add("True/False must have exactly one correct option.");
            }

            return errors;
        }

        if (isSingle)
        {
            if (filled.Length < 2)
            {
                errors.Add("Single Choice needs at least two options.");
            }

            if (correctCount != 1)
            {
                errors.Add("Single Choice must have exactly one correct option.");
            }

            return errors;
        }

        if (filled.Length < 2)
        {
            errors.Add("Multiple Choice needs at least two options.");
        }

        if (correctCount < 1)
        {
            errors.Add("Multiple Choice must have at least one correct option.");
        }

        return errors;
    }
}
