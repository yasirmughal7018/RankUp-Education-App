using RankUpEducation.Application.Lookups;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Quizzes;

/// <summary>When an owner must request permission to edit, and who reviews that request.</summary>
public static class QuizEditRequestRules
{
    public const int MinReasonLength = 10;

    /// <summary>
    /// Owner cannot edit in place after school/portal approval or after publish.
    /// Draft + Pending or Rejected remains owner-editable. PortalAdmin is never locked.
    /// </summary>
    public static bool IsLockedForOwnerEdit(string? lifecycleName, string? approvalName)
    {
        if (LookupNames.ArchivedLifecycleNames.Any(
                name => name.Equals(lifecycleName, StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        if (LookupNames.PublishedLifecycleNames.Any(
                name => name.Equals(lifecycleName, StringComparison.OrdinalIgnoreCase))
            || LookupNames.AssignedLifecycleNames.Any(
                name => name.Equals(lifecycleName, StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        return LookupNames.IsSchoolApprovedName(approvalName)
            || LookupNames.IsFinalApprovedName(approvalName);
    }

    /// <summary>
    /// Teacher/Coordinator: SchoolAdmin + CampusAdmin + PortalAdmin (anyone may grant).
    /// SchoolAdmin, CampusAdmin, Parent: PortalAdmin only.
    /// </summary>
    public static bool RoutesToSchoolAndCampusApprovers(UserRole requesterRole)
        => requesterRole is UserRole.Teacher or UserRole.Coordinator;

    public static bool CanReviewEditRequests(UserRole role)
        => role is UserRole.PortalAdmin or UserRole.SchoolAdmin or UserRole.CampusAdmin;
}
