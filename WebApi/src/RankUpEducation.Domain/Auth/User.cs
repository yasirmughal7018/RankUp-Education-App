using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Auth;

public sealed class User : SoftDeleteEntity
{
    private readonly List<RefreshToken> _refreshTokens = [];
    private readonly List<DeviceSession> _deviceSessions = [];

    private User()
    {
        Username = string.Empty;
        FullName = string.Empty;
    }

    public User(
        string username,
        string passwordHash,
        string fullName,
        UserRole role,
        long? profileId = null,
        int? schoolId = null,
        int? campusId = null)
    {
        Username = username.Trim();
        PasswordHash = passwordHash;
        FullName = fullName.Trim();
        Role = role;
        ProfileId = profileId;
        SchoolId = schoolId;
        CampusId = campusId;
        IsActive = true;
    }

    public string Username { get; private set; }
    public string? PasswordHash { get; private set; }
    public string FullName { get; private set; }
    public UserRole Role { get; private set; }
    public long? ProfileId { get; private set; }
    public int? SchoolId { get; private set; }
    public int? CampusId { get; private set; }
    public DateOnly? CreatedDate { get; private set; }
    public DateOnly? ModifiedDate { get; private set; }
    public bool IsActive { get; private set; }
    public DateTimeOffset? RequestedAt { get; private set; }
    public DateTimeOffset? LastLoginAt { get; private set; }
    public IReadOnlyCollection<RefreshToken> RefreshTokens => _refreshTokens;
    public IReadOnlyCollection<DeviceSession> DeviceSessions => _deviceSessions;

    public bool IsPendingRegistration => !IsActive && string.IsNullOrWhiteSpace(PasswordHash);

    public static User CreateRegistrationRequest(
        string username,
        string fullName,
        UserRole role,
        DateTimeOffset requestedAt)
    {
        return new User
        {
            Username = username.Trim(),
            FullName = fullName.Trim(),
            Role = role,
            PasswordHash = null,
            IsActive = false,
            RequestedAt = requestedAt
        };
    }

    public void EnsureCanLogin()
    {
        if (!IsActive || IsDeleted)
        {
            throw new BusinessRuleException("This account is not active.");
        }

        if (string.IsNullOrWhiteSpace(PasswordHash))
        {
            throw new BusinessRuleException("This account is pending admin approval.");
        }
    }

    public void Activate(string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(passwordHash))
        {
            throw new BusinessRuleException("Password is required to activate the account.");
        }

        PasswordHash = passwordHash;
        IsActive = true;
    }

    public void AttachProfileContext(long? profileId, int? schoolId, int? campusId)
    {
        ProfileId = profileId;
        SchoolId = schoolId;
        CampusId = campusId;
    }

    public void RecordLogin(DateTimeOffset loginAt)
    {
        LastLoginAt = loginAt;
    }

    public void AddRefreshToken(RefreshToken refreshToken)
    {
        _refreshTokens.Add(refreshToken);
    }

    public void RegisterDevice(DeviceSession deviceSession)
    {
        var existing = _deviceSessions.FirstOrDefault(session => session.DeviceId == deviceSession.DeviceId);
        if (existing is null)
        {
            _deviceSessions.Add(deviceSession);
            return;
        }

        existing.Update(deviceSession.Platform, deviceSession.PushToken, deviceSession.AppVersion, deviceSession.LastSeenAt);
    }
}
