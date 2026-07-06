using Microsoft.Extensions.Logging;
using RankUpEducation.Application.Common.Abstractions;

namespace RankUpEducation.Integration.Sms;

public sealed class NoOpSmsService : ISmsService
{
    private readonly ILogger<NoOpSmsService> _logger;

    public NoOpSmsService(ILogger<NoOpSmsService> logger)
    {
        _logger = logger;
    }

    public Task SendAsync(string mobileNumber, string message, CancellationToken cancellationToken)
    {
        _logger.LogInformation("SMS provider is not configured. Skipped SMS to {MobileNumber}.", mobileNumber);
        return Task.CompletedTask;
    }
}
