namespace RankUpEducation.Application.Common.Exceptions;

public sealed class ValidationAppException : AppException
{
    public ValidationAppException(IReadOnlyList<string> errors)
        : base("Validation failed.")
    {
        Errors = errors;
    }

    public IReadOnlyList<string> Errors { get; }
}
