using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Auth;

public sealed class DeviceSession : BaseEntity
{
    private DeviceSession()
    {
        DeviceId = string.Empty;
    }

    public DeviceSession(
        long userId,
        string deviceId,
        string? platform,
        string? pushToken,
        string? appVersion,
        DateTimeOffset lastSeenAt)
    {
        UserId = userId;
        DeviceId = deviceId.Trim();
        Platform = platform;
        PushToken = pushToken;
        AppVersion = appVersion;
        LastSeenAt = lastSeenAt;
    }

    public long UserId { get; private set; }
    public string DeviceId { get; private set; }
    public string? Platform { get; private set; }
    public string? PushToken { get; private set; }
    public string? AppVersion { get; private set; }
    public DateTimeOffset LastSeenAt { get; private set; }

    public void Update(string? platform, string? pushToken, string? appVersion, DateTimeOffset lastSeenAt)
    {
        Platform = platform;
        PushToken = pushToken;
        AppVersion = appVersion;
        LastSeenAt = lastSeenAt;
    }
}
