using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Auth;

public sealed class UserExternalLogin : BaseEntity
{
    public const string GoogleProvider = "Google";

    private UserExternalLogin()
    {
        Provider = string.Empty;
        ProviderUserId = string.Empty;
        Email = string.Empty;
    }

    public UserExternalLogin(
        long userId,
        string provider,
        string providerUserId,
        string email,
        DateTimeOffset linkedAt)
    {
        UserId = userId;
        Provider = provider.Trim();
        ProviderUserId = providerUserId.Trim();
        Email = email.Trim();
        LinkedAt = linkedAt;
    }

    public long UserId { get; private set; }
    public string Provider { get; private set; }
    public string ProviderUserId { get; private set; }
    public string Email { get; private set; }
    public DateTimeOffset LinkedAt { get; private set; }

    public void UpdateEmail(string email, DateTimeOffset linkedAt)
    {
        Email = email.Trim();
        LinkedAt = linkedAt;
    }
}
