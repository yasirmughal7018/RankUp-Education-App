using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Auth;

/// <summary>Push-notification device registration for a signed-in user.</summary>
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
        DeviceId = deviceId.AsTrimmedString();
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

    /// <summary>Updates metadata when the same device reconnects.</summary>
    public void Update(string? platform, string? pushToken, string? appVersion, DateTimeOffset lastSeenAt)
    {
        Platform = platform;
        PushToken = pushToken;
        AppVersion = appVersion;
        LastSeenAt = lastSeenAt;
    }
}
