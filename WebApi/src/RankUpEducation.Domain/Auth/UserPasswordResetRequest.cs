using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Auth;

/// <summary>
/// Forgot-password request (table: app_user_password_reset_request).
/// Email token and admin/parent clear share one pending request; the first completion wins.
/// </summary>
public sealed class UserPasswordResetRequest
{
    private UserPasswordResetRequest()
    {
    }

    private UserPasswordResetRequest(
        long userId,
        UserRole requesterRole,
        string? emailTokenHash,
        DateTimeOffset? emailTokenExpiresAt,
        DateTimeOffset requestedAt)
    {
        UserId = userId;
        RequesterRole = requesterRole;
        EmailTokenHash = emailTokenHash;
        EmailTokenExpiresAt = emailTokenExpiresAt;
        Status = PasswordResetRequestStatus.Pending;
        RequestedAt = requestedAt;
    }

    public long Id { get; private set; }
    public long UserId { get; private set; }
    public UserRole RequesterRole { get; private set; }
    public PasswordResetRequestStatus Status { get; private set; }
    public DateTimeOffset RequestedAt { get; private set; }
    public DateTimeOffset? ResolvedAt { get; private set; }
    public long? CompletedByUserId { get; private set; }
    public UserRole? CompletedByRole { get; private set; }
    public string? EmailTokenHash { get; private set; }
    public DateTimeOffset? EmailTokenExpiresAt { get; private set; }

    public bool IsPending => Status == PasswordResetRequestStatus.Pending;

    public static UserPasswordResetRequest Create(
        long userId,
        UserRole requesterRole,
        string? emailTokenHash,
        DateTimeOffset? emailTokenExpiresAt,
        DateTimeOffset requestedAt)
    {
        return new UserPasswordResetRequest(
            userId,
            requesterRole,
            emailTokenHash,
            emailTokenExpiresAt,
            requestedAt);
    }

    public bool MatchesEmailToken(string tokenHash, DateTimeOffset utcNow)
    {
        if (!IsPending || !EmailTokenHash.HasTrimmedText())
        {
            return false;
        }

        if (EmailTokenExpiresAt is null || EmailTokenExpiresAt.Value < utcNow)
        {
            return false;
        }

        return string.Equals(EmailTokenHash, tokenHash, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>Marks completed by email self-reset or by an admin/parent clear.</summary>
    public void Complete(DateTimeOffset resolvedAt, long? completedByUserId, UserRole? completedByRole)
    {
        if (!IsPending)
        {
            throw new BusinessRuleException(
                "This password reset request was already completed. No further reset is allowed.");
        }

        Status = PasswordResetRequestStatus.Completed;
        ResolvedAt = resolvedAt;
        CompletedByUserId = completedByUserId;
        CompletedByRole = completedByRole;
        EmailTokenHash = null;
        EmailTokenExpiresAt = null;
    }

    public void Cancel(DateTimeOffset resolvedAt)
    {
        if (!IsPending)
        {
            return;
        }

        Status = PasswordResetRequestStatus.Cancelled;
        ResolvedAt = resolvedAt;
        EmailTokenHash = null;
        EmailTokenExpiresAt = null;
    }
}
