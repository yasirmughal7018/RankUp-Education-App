using RankUpEducation.Contracts.Auth;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Auth;

internal static class RegistrationMapping
{
    public static PendingRegistrationResponse ToPendingResponse(this User user)
    {
        return new PendingRegistrationResponse(
            user.Id,
            user.Username,
            user.FullName,
            user.Role.ToString(),
            user.RequestedAt);
    }
}
