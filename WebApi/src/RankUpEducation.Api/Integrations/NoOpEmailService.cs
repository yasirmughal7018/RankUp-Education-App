using RankUpEducation.Application.Common.Abstractions;

namespace RankUpEducation.Api.Integrations;

public sealed class NoOpEmailService : IEmailService
{
    private readonly ILogger<NoOpEmailService> _logger;

    public NoOpEmailService(ILogger<NoOpEmailService> logger)
    {
        _logger = logger;
    }

    public Task SendAsync(string to, string subject, string body, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Email provider is not configured. Skipped email to {Recipient}.", to);
        return Task.CompletedTask;
    }
}
