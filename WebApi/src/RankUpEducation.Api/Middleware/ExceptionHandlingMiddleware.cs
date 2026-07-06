using System.Net;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Api.Middleware;

public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception exception)
        {
            await HandleAsync(context, exception);
        }
    }

    private async Task HandleAsync(HttpContext context, Exception exception)
    {
        var (statusCode, message, errors) = exception switch
        {
            ValidationAppException validation => (HttpStatusCode.BadRequest, validation.Message, validation.Errors),
            AuthenticationAppException authentication => (HttpStatusCode.Unauthorized, authentication.Message, Array.Empty<string>()),
            ForbiddenAppException forbidden => (HttpStatusCode.Forbidden, forbidden.Message, Array.Empty<string>()),
            NotFoundAppException notFound => (HttpStatusCode.NotFound, notFound.Message, Array.Empty<string>()),
            BusinessRuleException businessRule => (HttpStatusCode.BadRequest, businessRule.Message, Array.Empty<string>()),
            _ => (HttpStatusCode.InternalServerError, "Something went wrong. Please try again.", Array.Empty<string>())
        };

        if (statusCode == HttpStatusCode.InternalServerError)
        {
            _logger.LogError(exception, "Unhandled API exception.");
        }

        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(ApiResponse<object?>.Fail(message, errors));
    }
}
