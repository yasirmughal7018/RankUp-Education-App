using RankUpEducation.Contracts.Auth;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Auth;

internal static class AuthMapping
{
    public static CurrentUserResponse ToCurrentUserResponse(this User user)
    {
        var permissions = AuthPermissions.ForRole(user.Role);

        return new CurrentUserResponse(
            user.Id,
            user.Username,
            user.FullName,
            user.FullName,
            user.Role.ToString(),
            user.ProfileId,
            user.SchoolId,
            user.CampusId,
            permissions);
    }
}
