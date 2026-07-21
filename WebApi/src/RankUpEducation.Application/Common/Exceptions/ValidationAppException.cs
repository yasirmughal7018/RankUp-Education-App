namespace RankUpEducation.Application.Common.Exceptions;

/// <summary>Request validation failed; surfaces field-level errors as HTTP 400.</summary>
public sealed class ValidationAppException : AppException
{
    public ValidationAppException(IReadOnlyList<string> errors)
        : base(ResolveMessage(errors))
    {
        Errors = errors;
    }

    /// <summary>Individual validation messages returned to the client.</summary>
    public IReadOnlyList<string> Errors { get; }

    private static string ResolveMessage(IReadOnlyList<string> errors)
    {
        if (errors.Count == 0)
        {
            return "Validation failed.";
        }

        return errors.Count == 1
            ? errors[0]
            : string.Join(" ", errors);
    }
}
