using RankUpEducation.Contracts.Auth;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Auth;

internal static class RegistrationMapping
{
    public static PendingRegistrationResponse ToPendingResponse(
        this User user,
        IReadOnlyList<PendingApproverResponse> pendingApprovers)
    {
        return new PendingRegistrationResponse(
            user.Id,
            user.Username,
            user.FullName,
            user.Role.ToString(),
            user.RequestedAt,
            user.MobileNumber,
            user.EmailAddress,
            user.Cnic,
            user.SchoolId,
            user.CampusId,
            user.CreatedDate,
            user.ReasonMessage,
            user.AdminTarget,
            user.RollNumberTeacherCode,
            pendingApprovers);
    }
}
