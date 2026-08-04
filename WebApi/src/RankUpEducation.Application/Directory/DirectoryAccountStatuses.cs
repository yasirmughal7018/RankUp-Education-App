using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Directory;

/// <summary>
/// Directory account status codes aligned with
/// <c>02_RankUp_User_Creation_Approval_QA</c> login-status states.
/// </summary>
public static class DirectoryAccountStatuses
{
    public const string Active = "Active";
    public const string ApprovedInactive = "ApprovedInactive";
    public const string PendingApproval = "PendingApproval";
    public const string Locked = "Locked";
    public const string Deactivated = "Deactivated";
    public const string Rejected = "Rejected";

    /// <summary>Derives the directory account status from user flags.</summary>
    public static string Resolve(
        bool isActive,
        bool hasPassword,
        bool isRejected,
        bool isLockedPendingSchoolChange)
    {
        if (isRejected)
        {
            return Rejected;
        }

        if (isActive && !hasPassword)
        {
            return ApprovedInactive;
        }

        if (isActive && hasPassword)
        {
            return Active;
        }

        if (!hasPassword)
        {
            return PendingApproval;
        }

        if (isLockedPendingSchoolChange)
        {
            return Locked;
        }

        return Deactivated;
    }

    /// <summary>Maps a <see cref="User"/> to the directory account status string.</summary>
    public static string FromUser(User user, bool isLockedPendingSchoolChange = false)
        => Resolve(
            user.IsActive,
            user.PasswordHash.HasTrimmedText(),
            user.IsRejectedRegistration,
            isLockedPendingSchoolChange);
}
