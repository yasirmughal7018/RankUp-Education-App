using RankUpEducation.Common.Utilities;
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
        Username = username.AsTrimmedString();
        PasswordHash = passwordHash;
        FullName = fullName.AsTrimmedString();
        Role = role;
        ProfileId = profileId;
        SchoolId = schoolId;
        CampusId = campusId;
        MobileNumber = mobileNumber.AsTrimmedOrNull();
        Cnic = cnic.AsTrimmedOrNull();
        EmailAddress = emailAddress.AsNormalizedEmailOrNull();
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
    public bool? MustChangePassword { get; private set; }
    public string? ReasonMessage { get; private set; }
    public string? AdminTarget { get; private set; }
    /// <summary>Student roll number or teacher code (shared identity field).</summary>
    public string? RollNumberTeacherCode { get; private set; }
    public DateOnly? CreatedDate { get; private set; }
    public DateOnly? ModifiedDate { get; private set; }
    public bool IsActive { get; private set; }
    public DateTimeOffset? RequestedAt { get; private set; }
    public DateTimeOffset? LastLoginAt { get; private set; }
    public IReadOnlyCollection<RefreshToken> RefreshTokens => _refreshTokens;
    public IReadOnlyCollection<DeviceSession> DeviceSessions => _deviceSessions;

    public bool IsPendingRegistration => !IsActive && !PasswordHash.HasTrimmedText();

    /// <summary>Approved by admin but user has not set a password yet.</summary>
    public bool NeedsPasswordSetup => IsActive && !PasswordHash.HasTrimmedText();

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
        string? rollNumberTeacherCode = null)
    {
        return new User
        {
            Username = username.AsTrimmedString(),
            FullName = fullName.AsTrimmedString(),
            Role = role,
            PasswordHash = null,
            IsActive = false,
            RequestedAt = requestedAt,
            MobileNumber = mobileNumber.AsTrimmedString(),
            EmailAddress = emailAddress.AsNormalizedEmailOrNull(),
            Cnic = cnic.AsTrimmedOrNull(),
            SchoolId = schoolId,
            CampusId = campusId,
            CreatedDate = DateOnly.FromDateTime(DateTime.UtcNow),
            ReasonMessage = reasonMessage.AsTrimmedOrNull(),
            AdminTarget = adminTarget.AsTrimmedOrNull(),
            RollNumberTeacherCode = rollNumberTeacherCode.AsTrimmedOrNull(),
            MustChangePassword = null
        };
    }

    public void EnsureCanLogin()
    {
        if (IsDeleted)
        {
            throw new BusinessRuleException("This account is not active.");
        }

        // Pending registration: inactive and no password until an admin approves.
        if (IsPendingRegistration)
        {
            throw new BusinessRuleException(
                "Your login is not approved yet. Please wait for admin approval.");
        }

        if (!IsActive)
        {
            throw new BusinessRuleException("This account is not active.");
        }

        // NeedsPasswordSetup is allowed through LoginAsync (password setup path).
        // Callers that require a full password must check NeedsPasswordSetup separately.
    }

    public void EnsureHasPassword()
    {
        if (!PasswordHash.HasTrimmedText())
        {
            throw new BusinessRuleException(
                "You must set a password before continuing.");
        }
    }

    /// <summary>Approve registration without setting a password. User must set one on first login.</summary>
    public void ApprovePendingRegistration()
    {
        if (!IsPendingRegistration)
        {
            throw new BusinessRuleException("This user is not a pending registration request.");
        }

        IsActive = true;
        PasswordHash = null;
        MustChangePassword = true;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    public void Activate(string passwordHash)
    {
        if (!passwordHash.HasTrimmedText())
        {
            throw new BusinessRuleException("Password is required to activate the account.");
        }

        PasswordHash = passwordHash;
        IsActive = true;
    }

    public void RequirePasswordChange()
    {
        // true = user must change password on next login.
        MustChangePassword = true;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    public void ClearPasswordChangeRequirement()
    {
        // null/false = no forced change required (after user changes once → false).
        MustChangePassword = false;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    public void SetUsername(string username)
    {
        if (!username.HasTrimmedText())
        {
            throw new BusinessRuleException("Username is required.");
        }

        Username = username.AsTrimmedString();
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
        if (mobileNumber.HasTrimmedText())
        {
            MobileNumber = mobileNumber.AsTrimmedString();
        }

        if (cnic.HasTrimmedText())
        {
            Cnic = cnic.AsTrimmedString();
        }

        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    public void SetRollNumberTeacherCode(string? rollNumberTeacherCode)
    {
        RollNumberTeacherCode = rollNumberTeacherCode.AsTrimmedOrNull();
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    public void UpdateProfile(string fullName)
    {
        FullName = fullName.AsTrimmedString();
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    public void SetActive(bool isActive)
    {
        IsActive = isActive;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    public void SetPasswordHash(string passwordHash)
    {
        if (!passwordHash.HasTrimmedText())
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
}
