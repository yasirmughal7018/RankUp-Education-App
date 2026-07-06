using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Auth;

public sealed class RefreshToken : BaseEntity
{
    private RefreshToken()
    {
        TokenHash = string.Empty;
    }

    public RefreshToken(long userId, string tokenHash, DateTimeOffset expiresAt)
    {
        UserId = userId;
        TokenHash = tokenHash;
        ExpiresAt = expiresAt;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public long UserId { get; private set; }
    public string TokenHash { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset ExpiresAt { get; private set; }
    public DateTimeOffset? RevokedAt { get; private set; }

    public bool IsActive(DateTimeOffset now) => RevokedAt is null && ExpiresAt > now;

    public void Revoke(DateTimeOffset revokedAt)
    {
        RevokedAt = revokedAt;
    }
}
