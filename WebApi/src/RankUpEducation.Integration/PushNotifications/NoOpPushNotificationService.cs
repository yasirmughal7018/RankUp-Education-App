using Microsoft.Extensions.Logging;
using RankUpEducation.Application.Common.Abstractions;

namespace RankUpEducation.Integration.PushNotifications;

public sealed class NoOpPushNotificationService : IPushNotificationService
{
    private readonly ILogger<NoOpPushNotificationService> _logger;

    public NoOpPushNotificationService(ILogger<NoOpPushNotificationService> logger)
    {
        _logger = logger;
    }

    public Task SendAsync(string pushToken, string title, string body, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Push provider is not configured. Skipped push notification.");
        return Task.CompletedTask;
    }
}
