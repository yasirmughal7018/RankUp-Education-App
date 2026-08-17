using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Contracts.Questions;

namespace RankUpEducation.Application.Questions;

/// <summary>
/// Validates question-bank payloads by type.
/// Create (web, mobile, Excel import, quiz inline) offers: Single Choice, Multiple Choice,
/// True/False, Fill in the Blanks, Descriptive, Matching, Ordering.
/// File Upload and Media remain valid for existing rows until re-enabled.
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
            request.AcceptedAnswers,
            offeredForCreate: true);
    }

    /// <summary>Validates update request text, marks, type, and answers/options.</summary>
    public static void ValidateUpdateRequest(UpdateQuestionRequest request)
    {
        ValidateCore(
            request.QuestionText,
            request.QuestionType,
            request.Marks,
            request.Options,
            request.AcceptedAnswers,
            offeredForCreate: false);
    }

    /// <summary>
    /// File Upload / Media are hidden on create. Existing rows can still be updated.
    /// </summary>
    public static string? HiddenCreateTypeError(string questionType)
    {
        if (string.IsNullOrWhiteSpace(questionType))
        {
            return null;
        }

        if (!QuizQuestionHelper.IsFileUploadType(questionType)
            && !QuizQuestionHelper.IsMediaType(questionType))
        {
            return null;
        }

        var name = QuizQuestionHelper.IsFileUploadType(questionType) ? "File Upload" : "Media";
        return $"{name} is hidden for now. Create with Single Choice, Multiple Choice, True/False, Fill in the Blanks, Descriptive, Matching, or Ordering.";
    }

    /// <summary>Shared create/update validation (does not check org or status).</summary>
    public static void ValidateCore(
        string questionText,
        string questionType,
        short marks,
        IReadOnlyList<QuestionOptionRequest> options,
        IReadOnlyList<QuestionAcceptedAnswerRequest>? acceptedAnswers,
        bool offeredForCreate = false)
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
            var hidden = offeredForCreate ? HiddenCreateTypeError(questionType) : null;
            if (hidden is not null)
            {
                errors.Add(hidden);
            }
            else
            {
                errors.AddRange(ValidateTypeAndAnswers(questionType, options, acceptedAnswers));
            }
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

    /// <summary>Quiz-inline options may include image URLs (Media).</summary>
    public static IReadOnlyList<string> ValidateTypeAndOptions(
        string questionType,
        IReadOnlyList<QuestionOptionRequest> options)
        => ValidateTypeAndAnswers(questionType, options, Array.Empty<QuestionAcceptedAnswerRequest>());

    /// <summary>Public wrapper for quiz-inline Fill validation with accepted-answer flags.</summary>
    public static IReadOnlyList<string> ValidateTypeAndAnswersPublic(
        string questionType,
        IReadOnlyList<QuestionOptionRequest> options,
        IReadOnlyList<QuestionAcceptedAnswerRequest>? acceptedAnswers)
        => ValidateTypeAndAnswers(questionType, options, acceptedAnswers);

    /// <summary>
    /// Type-specific answer rules: Fill needs ≥1 accepted answer (options fallback for legacy);
    /// True/False exactly 2 options / 1 correct; Single ≥2 / 1 correct; Multi ≥2 / ≥1 correct;
    /// Descriptive / File Upload need no options (File is link/path MVP via attempt SubmittedText);
    /// Matching even count ≥4 (lefts then rights); Ordering ≥2 items;
    /// Media ≥2 options each with an image URL / 1 correct.
    /// </summary>
    private static IReadOnlyList<string> ValidateTypeAndAnswers(
        string questionType,
        IReadOnlyList<QuestionOptionRequest> options,
        IReadOnlyList<QuestionAcceptedAnswerRequest>? acceptedAnswers)
    {
        var errors = new List<string>();
        var type = questionType.Trim();

        if (QuizQuestionHelper.IsDescriptiveType(type)
            || QuizQuestionHelper.IsFileUploadType(type))
        {
            // Open text / file link — no options required.
            return errors;
        }

        var isMulti = QuizQuestionHelper.IsMultiSelectType(type);
        var isTrueFalse = QuizQuestionHelper.IsTrueFalseType(type);
        var isFill = QuizQuestionHelper.IsFillBlankType(type);
        var isMatching = QuizQuestionHelper.IsMatchingType(type);
        var isOrdering = QuizQuestionHelper.IsOrderingType(type);
        var isMedia = QuizQuestionHelper.IsMediaType(type);
        var isSingle = QuizQuestionHelper.IsSingleChoiceType(type) && !isMedia;

        if (!isSingle && !isMulti && !isTrueFalse && !isFill && !isMatching && !isOrdering && !isMedia)
        {
            errors.Add(
                $"Question type '{questionType}' is not supported.");
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

        if (isMedia)
        {
            var mediaOptions = options
                .Where(option =>
                    !string.IsNullOrWhiteSpace(option.OptionText)
                    || !string.IsNullOrWhiteSpace(option.OptionImageUrl))
                .ToArray();

            if (mediaOptions.Length < 2)
            {
                errors.Add("Media needs at least two options.");
            }

            if (mediaOptions.Any(option => string.IsNullOrWhiteSpace(option.OptionImageUrl)))
            {
                errors.Add("Each Media option needs an image URL.");
            }

            if (mediaOptions.Count(option => option.IsCorrect) != 1)
            {
                errors.Add("Media must have exactly one correct option.");
            }

            return errors;
        }

        var filled = options
            .Where(option => !string.IsNullOrWhiteSpace(option.OptionText))
            .Select(option => (Text: option.OptionText.Trim(), option.IsCorrect))
            .ToArray();

        var correctCount = filled.Count(option => option.IsCorrect);

        if (isMatching)
        {
            if (filled.Length < 4 || filled.Length % 2 != 0)
            {
                errors.Add("Matching needs an even number of options (left items first, then matching right items).");
            }

            return errors;
        }

        if (isOrdering)
        {
            if (filled.Length < 2)
            {
                errors.Add("Ordering needs at least two items.");
            }

            return errors;
        }

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
