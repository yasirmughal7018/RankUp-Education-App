using RankUpEducation.Application.Lookups;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Quizzes;

/// <summary>Shared assign eligibility rules for teacher/admin roles (QZ-02, QZ-03).</summary>
public static class QuizAssignRules
{
    /// <summary>
    /// Teachers/coordinators/portal admins require final Approved; SchoolAdmin may assign at SchoolApproved.
    /// Parent and other roles are not validated here.
    /// </summary>
    public static bool CanAssignWithApproval(UserRole role, string approvalName)
        => LookupNames.IsFinalApprovedName(approvalName)
            || (role == UserRole.SchoolAdmin && LookupNames.IsSchoolApprovedName(approvalName));
}
