namespace RankUpEducation.Application.Common.Abstractions;

/// <summary>Mobile push notification integration for device tokens.</summary>
public interface IPushNotificationService
{
    /// <summary>Sends a push notification to the registered device token.</summary>
    Task SendAsync(string pushToken, string title, string body, CancellationToken cancellationToken);
}
