using RankUpEducation.Contracts.Auth;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Auth;

internal static class AuthMapping
{
    /// <summary>Maps a domain user to the API session profile for the active role.</summary>
    public static CurrentUserResponse ToCurrentUserResponse(
        this User user,
        UserRole? activeRole = null,
        CurrentUserPendingSchoolChange? pendingSchoolChange = null)
    {
        var role = activeRole ?? user.Role;
        if (!user.HasRole(role))
        {
            role = user.Role;
        }

        var permissions = AuthPermissions.ForRole(role);
        var mustChangePassword = user.MustChangePassword == true || user.NeedsPasswordSetup;
        var roles = user.Roles.Select(r => r.ToString()).ToList();

        return new CurrentUserResponse(
            user.Id,
            user.Username,
            user.FullName,
            user.FullName,
            role.ToString(),
            roles,
            user.ProfileId,
            user.SchoolId,
            user.CampusId,
            user.EmailAddress,
            user.MobileNumber,
            user.Cnic,
            user.AvatarUrl,
            pendingSchoolChange,
            permissions,
            mustChangePassword);
    }
}
