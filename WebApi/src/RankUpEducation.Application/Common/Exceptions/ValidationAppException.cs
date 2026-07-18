namespace RankUpEducation.Application.Common.Exceptions;

public sealed class ValidationAppException : AppException
{
    public ValidationAppException(IReadOnlyList<string> errors)
        : base(ResolveMessage(errors))
    {
        Errors = errors;
    }

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
