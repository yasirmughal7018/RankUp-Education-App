namespace RankUpEducation.Contracts.Common;

public sealed record ApiResponse<T>(
    bool Success,
    string Message,
    T? Data,
    IReadOnlyList<string> Errors)
{
    public static ApiResponse<T> Ok(T? data, string message = "Operation completed successfully.")
    {
        return new ApiResponse<T>(true, message, data, Array.Empty<string>());
    }

    public static ApiResponse<T> Fail(string message, IReadOnlyList<string>? errors = null)
    {
        return new ApiResponse<T>(false, message, default, errors ?? Array.Empty<string>());
    }
}
