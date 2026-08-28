using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Quizzes;

/// <summary>
/// Scoring rights follow who assigned the quiz. Viewers can still open answers and marks.
/// PortalAdmin may score any assignment.
/// </summary>
public static class QuizReviewAuthorizationRules
{
    /// <summary>Parent-assigned work is scored by parents; staff-assigned work is scored by teachers and school/campus admins.</summary>
    public static bool CanScore(UserRole callerRole, UserRole assignedByRole)
    {
        if (callerRole == UserRole.PortalAdmin)
        {
            return true;
        }

        var origin = NormalizeAssignedByRole(assignedByRole);
        if (origin == UserRole.Parent)
        {
            return callerRole == UserRole.Parent;
        }

        return callerRole is UserRole.Teacher
            or UserRole.Coordinator
            or UserRole.CampusAdmin
            or UserRole.SchoolAdmin;
    }

    /// <summary>Missing/legacy assigner role is treated as teacher-assigned (staff scoring).</summary>
    public static UserRole NormalizeAssignedByRole(UserRole assignedByRole)
        => Enum.IsDefined(assignedByRole) ? assignedByRole : UserRole.Teacher;

    public static string DescribeScoreDenial(UserRole assignedByRole)
        => NormalizeAssignedByRole(assignedByRole) == UserRole.Parent
            ? "Only the parent who assigned this quiz can update scores. Contact the parent if something is wrong."
            : "Only the teacher, campus admin, or school admin can update scores for this quiz. Contact them if something is wrong.";
}
