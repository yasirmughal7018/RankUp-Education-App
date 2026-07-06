namespace RankUpEducation.Contracts.Devices;

public sealed record RegisterDeviceRequest(
    string DeviceId,
    string? Platform,
    string? PushToken,
    string? AppVersion);
