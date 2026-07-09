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
        int? campusId = null,
        string? mobileNumber = null,
        string? cnic = null,
        string? emailAddress = null)
    {
        Username = username.Trim();
        PasswordHash = passwordHash;
        FullName = fullName.Trim();
        Role = role;
        ProfileId = profileId;
        SchoolId = schoolId;
        CampusId = campusId;
        MobileNumber = NormalizeOptional(mobileNumber);
        Cnic = NormalizeOptional(cnic);
        EmailAddress = NormalizeOptional(emailAddress);
        CreatedDate = DateOnly.FromDateTime(DateTime.UtcNow);
        IsActive = true;
        MustChangePassword = false;
    }

    public string Username { get; private set; }
    public string? PasswordHash { get; private set; }
    public string FullName { get; private set; }
    public UserRole Role { get; private set; }
    public long? ProfileId { get; private set; }
    public int? SchoolId { get; private set; }
    public int? CampusId { get; private set; }
    public string? MobileNumber { get; private set; }
    public string? Cnic { get; private set; }
    public string? EmailAddress { get; private set; }
    public bool MustChangePassword { get; private set; }
    public string? ReasonMessage { get; private set; }
    public string? AdminTarget { get; private set; }
    public string? SchoolCampusName { get; private set; }
    public string? StudentOrEmployeeId { get; private set; }
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
        DateTimeOffset requestedAt,
        string mobileNumber,
        string? emailAddress = null,
        string? cnic = null,
        int? schoolId = null,
        int? campusId = null,
        string? reasonMessage = null,
        string? adminTarget = null,
        string? schoolCampusName = null,
        string? studentOrEmployeeId = null)
    {
        return new User
        {
            Username = username.Trim(),
            FullName = fullName.Trim(),
            Role = role,
            PasswordHash = null,
            IsActive = false,
            RequestedAt = requestedAt,
            MobileNumber = mobileNumber.Trim(),
            EmailAddress = NormalizeOptional(emailAddress),
            Cnic = NormalizeOptional(cnic),
            SchoolId = schoolId,
            CampusId = campusId,
            CreatedDate = DateOnly.FromDateTime(DateTime.UtcNow),
            ReasonMessage = NormalizeOptional(reasonMessage),
            AdminTarget = NormalizeOptional(adminTarget),
            SchoolCampusName = NormalizeOptional(schoolCampusName),
            StudentOrEmployeeId = NormalizeOptional(studentOrEmployeeId),
            MustChangePassword = false
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

    public void RequirePasswordChange()
    {
        MustChangePassword = true;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    public void ClearPasswordChangeRequirement()
    {
        MustChangePassword = false;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    public void AssignSchoolCampus(int? schoolId, int? campusId)
    {
        if (schoolId.HasValue)
        {
            SchoolId = schoolId;
        }

        if (campusId.HasValue)
        {
            CampusId = campusId;
        }

        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    public void UpdateContactInfo(string? mobileNumber, string? cnic)
    {
        if (!string.IsNullOrWhiteSpace(mobileNumber))
        {
            MobileNumber = mobileNumber.Trim();
        }

        if (!string.IsNullOrWhiteSpace(cnic))
        {
            Cnic = cnic.Trim();
        }

        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    public void UpdateProfile(string fullName)
    {
        FullName = fullName.Trim();
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    public void SetActive(bool isActive)
    {
        IsActive = isActive;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    public void SetPasswordHash(string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(passwordHash))
        {
            throw new BusinessRuleException("Password hash is required.");
        }

        PasswordHash = passwordHash;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
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

    private static string? NormalizeOptional(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
