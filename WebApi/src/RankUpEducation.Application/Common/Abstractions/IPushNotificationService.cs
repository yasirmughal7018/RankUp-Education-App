namespace RankUpEducation.Application.Common.Abstractions;

public interface IPushNotificationService
{
    Task SendAsync(string pushToken, string title, string body, CancellationToken cancellationToken);
}
