using RankUpEducation.Application.Lookups;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Quizzes;

/// <summary>Shared assign eligibility and mode allow-lists per role.</summary>
public static class QuizAssignRules
{
    /// <summary>
    /// Teachers/coordinators/portal admins require final Approved; SchoolAdmin may assign at SchoolApproved.
    /// Parent and other roles are not validated here.
    /// </summary>
    public static bool CanAssignWithApproval(UserRole role, string approvalName)
        => LookupNames.IsFinalApprovedName(approvalName)
            || (role == UserRole.SchoolAdmin && LookupNames.IsSchoolApprovedName(approvalName));

    /// <summary>Assignment modes each role may send to POST assign.</summary>
    public static IReadOnlyList<string> ModesForRole(UserRole role)
        => role switch
        {
            UserRole.Parent => ["one", "selected", "group", "alllinked"],
            UserRole.Teacher =>
                ["one", "selected", "group", "allattached", "allingrade", "allinsection"],
            UserRole.Coordinator =>
                ["one", "selected", "group", "allattached", "allingrade", "allinsection"],
            UserRole.CampusAdmin =>
                ["one", "selected", "group", "allincampus", "allingrade", "allinsection"],
            UserRole.SchoolAdmin =>
            [
                "one", "selected", "group",
                "allincampus", "allingrade", "allinsection", "allinschool",
            ],
            UserRole.PortalAdmin =>
            [
                "one", "selected", "group",
                "allincampus", "allingrade", "allinsection", "allinschool",
                "multischool", "public",
            ],
            _ => [],
        };

    /// <summary>True when <paramref name="mode"/> is allowed for the active role.</summary>
    public static bool IsSupportedMode(UserRole role, string mode)
        => ModesForRole(role).Contains(mode, StringComparer.OrdinalIgnoreCase);
}
