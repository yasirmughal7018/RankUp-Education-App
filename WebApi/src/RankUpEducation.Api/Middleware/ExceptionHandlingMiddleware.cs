using System.Net;
using Microsoft.Extensions.Hosting;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Api.Middleware;

/// <summary>Maps application and domain exceptions to consistent JSON error responses.</summary>
public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    /// <summary>Creates the middleware.</summary>
    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    /// <summary>Runs the pipeline and converts unhandled exceptions to <see cref="ApiResponse{T}"/> failures.</summary>
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // Client disconnected / navigated away — not an API failure.
            // Let the host complete without logging a 500.
        }
        catch (Exception exception)
        {
            await HandleAsync(context, exception);
        }
    }

    private async Task HandleAsync(HttpContext context, Exception exception)
    {
        var isDevelopment = context.RequestServices
            .GetService<IHostEnvironment>()
            ?.IsDevelopment() == true;

        var (statusCode, message, errors) = exception switch
        {
            OperationCanceledException => (HttpStatusCode.RequestTimeout, "Request was cancelled.", Array.Empty<string>()),
            ValidationAppException validation => (HttpStatusCode.BadRequest, validation.Message, validation.Errors),
            AuthenticationAppException authentication => (HttpStatusCode.Unauthorized, authentication.Message, Array.Empty<string>()),
            ForbiddenAppException forbidden => (HttpStatusCode.Forbidden, forbidden.Message, Array.Empty<string>()),
            NotFoundAppException notFound => (HttpStatusCode.NotFound, notFound.Message, Array.Empty<string>()),
            BusinessRuleException businessRule => (HttpStatusCode.BadRequest, businessRule.Message, Array.Empty<string>()),
            _ when IsEfUpdateException(exception) => (
                HttpStatusCode.BadRequest,
                "Unable to save changes.",
                new[] { exception.GetBaseException().Message }),
            _ => (
                HttpStatusCode.InternalServerError,
                "Something went wrong. Please try again.",
                isDevelopment
                    ? new[] { exception.GetBaseException().Message }
                    : Array.Empty<string>())
        };

        // Prefer not writing a body when the client already disconnected.
        if (exception is OperationCanceledException && context.RequestAborted.IsCancellationRequested)
        {
            return;
        }

        if (statusCode == HttpStatusCode.InternalServerError)
        {
            _logger.LogError(exception, "Unhandled API exception.");
        }

        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(ApiResponse<object?>.Fail(message, errors));
    }

    private static bool IsEfUpdateException(Exception exception)
    {
        for (var current = exception; current is not null; current = current.InnerException)
        {
            var name = current.GetType().Name;
            if (name is "DbUpdateException" or "DbUpdateConcurrencyException")
            {
                return true;
            }
        }

        return false;
    }
}
