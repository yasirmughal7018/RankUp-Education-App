using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Auth;

/// <summary>
/// Long-lived refresh credential (table: app_refresh_tokens). Bound to an active role for role switching.
/// </summary>
public sealed class RefreshToken : BaseEntity
{
    private RefreshToken()
    {
        TokenHash = string.Empty;
    }

    public RefreshToken(long userId, string tokenHash, DateTimeOffset expiresAt, UserRole? activeRole = null)
    {
        UserId = userId;
        TokenHash = tokenHash;
        ExpiresAt = expiresAt;
        CreatedAt = DateTimeOffset.UtcNow;
        ActiveRole = activeRole;
    }

    public long UserId { get; private set; }
    public string TokenHash { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset ExpiresAt { get; private set; }
    public DateTimeOffset? RevokedAt { get; private set; }
    /// <summary>Role embedded in the session when the token was issued.</summary>
    public UserRole? ActiveRole { get; private set; }

    /// <summary>True when not revoked and not expired.</summary>
    public bool IsActive(DateTimeOffset now) => RevokedAt is null && ExpiresAt > now;

    /// <summary>Invalidates the token (logout, password reset, school-change lock).</summary>
    public void Revoke(DateTimeOffset revokedAt)
    {
        RevokedAt = revokedAt;
    }
}
