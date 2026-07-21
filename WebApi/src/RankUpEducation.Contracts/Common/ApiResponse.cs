namespace RankUpEducation.Contracts.Common;

/// <summary>Standard API envelope wrapping success flag, message, payload, and validation errors.</summary>
public sealed record ApiResponse<T>(
    bool Success,
    string Message,
    T? Data,
    IReadOnlyList<string> Errors)
{
    /// <summary>Successful response with optional user-facing message.</summary>
    public static ApiResponse<T> Ok(T? data, string message = "Operation completed successfully.")
    {
        return new ApiResponse<T>(true, message, data, Array.Empty<string>());
    }

    /// <summary>Failed response with message and optional error details.</summary>
    public static ApiResponse<T> Fail(string message, IReadOnlyList<string>? errors = null)
    {
        return new ApiResponse<T>(false, message, default, errors ?? Array.Empty<string>());
    }
}
