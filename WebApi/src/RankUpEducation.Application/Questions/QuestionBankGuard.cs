using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Contracts.Questions;

namespace RankUpEducation.Application.Questions;

internal static class QuestionBankGuard
{
    public static void ValidateCreateRequest(CreateQuestionRequest request)
    {
        ValidateCore(
            request.QuestionText,
            request.Marks,
            request.Options);
    }

    public static void ValidateUpdateRequest(UpdateQuestionRequest request)
    {
        ValidateCore(
            request.QuestionText,
            request.Marks,
            request.Options);
    }

    private static void ValidateCore(
        string questionText,
        short marks,
        IReadOnlyList<QuestionOptionRequest> options)
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

        if (options.Count > 0 && !options.Any(option => option.IsCorrect))
        {
            errors.Add("At least one option must be marked correct.");
        }

        if (errors.Count > 0)
        {
            throw new ValidationAppException(errors);
        }
    }
}
