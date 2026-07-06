using RankUpEducation.Application.Common.Abstractions;

namespace RankUpEducation.Api.Integrations;

public sealed class NoOpPushNotificationService : IPushNotificationService
{
    private readonly ILogger<NoOpPushNotificationService> _logger;

    public NoOpPushNotificationService(ILogger<NoOpPushNotificationService> logger)
    {
        _logger = logger;
    }

    public Task SendAsync(string pushToken, string title, string body, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Push notification provider is not configured. Skipped push notification.");
        return Task.CompletedTask;
    }
}
