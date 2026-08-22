using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Quizzes;

/// <summary>
/// Who reviews a submitted quiz, based on the creator's role.
/// Teacher/Coordinator → SchoolAdmin or CampusAdmin may endorse (Pending → SchoolApproved), then PortalAdmin.
/// CampusAdmin → SchoolAdmin may endorse (Pending → SchoolApproved), then PortalAdmin.
/// SchoolAdmin, Parent, and PortalAdmin creators → PortalAdmin only (Pending → Approved).
/// </summary>
public static class QuizApprovalRouting
{
    /// <summary>Creator roles whose quizzes skip school/campus endorsement.</summary>
    public static bool RequiresPortalAdminOnlyReview(UserRole creatorRole)
        => creatorRole is UserRole.SchoolAdmin
            or UserRole.Parent
            or UserRole.PortalAdmin;

    /// <summary>
    /// Whether this reviewer may school-approve the creator's quiz.
    /// SchoolAdmin: Teacher, Coordinator, or CampusAdmin. CampusAdmin: Teacher or Coordinator.
    /// </summary>
    public static bool MayEndorse(UserRole reviewerRole, UserRole creatorRole)
        => reviewerRole switch
        {
            UserRole.SchoolAdmin => creatorRole is UserRole.Teacher
                or UserRole.Coordinator
                or UserRole.CampusAdmin,
            UserRole.CampusAdmin => creatorRole is UserRole.Teacher or UserRole.Coordinator,
            _ => false,
        };

    /// <summary>True when any school/campus reviewer may endorse this creator (not PortalAdmin-only).</summary>
    public static bool SchoolOrCampusMayEndorse(UserRole creatorRole)
        => MayEndorse(UserRole.SchoolAdmin, creatorRole);

    /// <summary>
    /// Picks the quiz-author role from a user's assignments. Exclusive admin roles win;
    /// otherwise Teacher, then Coordinator, then Parent.
    /// </summary>
    public static UserRole ResolveCreatorRole(IReadOnlyList<UserRole> roles)
    {
        if (roles.Contains(UserRole.PortalAdmin))
        {
            return UserRole.PortalAdmin;
        }

        if (roles.Contains(UserRole.SchoolAdmin))
        {
            return UserRole.SchoolAdmin;
        }

        if (roles.Contains(UserRole.CampusAdmin))
        {
            return UserRole.CampusAdmin;
        }

        if (roles.Contains(UserRole.Teacher))
        {
            return UserRole.Teacher;
        }

        if (roles.Contains(UserRole.Coordinator))
        {
            return UserRole.Coordinator;
        }

        if (roles.Contains(UserRole.Parent))
        {
            return UserRole.Parent;
        }

        return UserRole.Teacher;
    }

    public static bool TryParseCreatorUserId(string? createdByName, out long userId)
        => long.TryParse(createdByName, out userId) && userId > 0;

    public static string DescribeSchoolCampusDenied(UserRole creatorRole)
        => creatorRole == UserRole.CampusAdmin
            ? "Only a school admin or portal admin can approve or reject quizzes created by campus admins."
            : RequiresPortalAdminOnlyReview(creatorRole)
                ? "Only a portal admin can approve or reject quizzes created by school admins or parents."
                : "You do not have permission to approve or reject this quiz.";
}
