namespace RankUpEducation.Domain.Auth;

/// <summary>One role assigned to a user. Table: app_user_roles.</summary>
public sealed class UserRoleAssignment
{
    private UserRoleAssignment()
    {
    }

    public UserRoleAssignment(long userId, UserRole role, DateTimeOffset createdAt)
    {
        UserId = userId;
        Role = role;
        CreatedAt = createdAt;
    }

    public long UserId { get; private set; }
    public UserRole Role { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
}
