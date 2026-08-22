using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Quizzes;

/// <summary>
/// Who reviews a submitted quiz, based on the creator's role (mirrors question-bank hierarchy).
/// Teacher/Coordinator → SchoolAdmin or CampusAdmin may endorse (Pending → SchoolApproved), then PortalAdmin.
/// SchoolAdmin, CampusAdmin, Parent, Tutor, and PortalAdmin creators → PortalAdmin only (Pending → Approved).
/// </summary>
public static class QuizApprovalRouting
{
    /// <summary>Creator roles whose quizzes skip school/campus endorsement.</summary>
    public static bool RequiresPortalAdminOnlyReview(UserRole creatorRole)
        => creatorRole is UserRole.SchoolAdmin
            or UserRole.CampusAdmin
            or UserRole.Parent
            or UserRole.Tutor
            or UserRole.PortalAdmin;

    /// <summary>SchoolAdmin/CampusAdmin may school-approve only Teacher and Coordinator quizzes.</summary>
    public static bool SchoolOrCampusMayEndorse(UserRole creatorRole)
        => creatorRole is UserRole.Teacher or UserRole.Coordinator;

    /// <summary>
    /// Picks the quiz-author role from a user's assignments. Exclusive admin roles win;
    /// otherwise Teacher, then Coordinator, then Parent, then Tutor.
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

        if (roles.Contains(UserRole.Tutor))
        {
            return UserRole.Tutor;
        }

        return UserRole.Teacher;
    }

    public static bool TryParseCreatorUserId(string? createdByName, out long userId)
        => long.TryParse(createdByName, out userId) && userId > 0;

    public static string DescribeSchoolCampusDenied(UserRole creatorRole)
        => RequiresPortalAdminOnlyReview(creatorRole)
            ? "Only a portal admin can approve or reject quizzes created by school admins, campus admins, parents, or tutors."
            : "You do not have permission to approve or reject this quiz.";
}
