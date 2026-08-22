using RankUpEducation.Application.Lookups;

namespace RankUpEducation.Application.Quizzes;

/// <summary>
/// Work-in-progress drafts stay owner-only until Submit for approval.
/// After that, PortalAdmin (and approval queues) may see the pipeline draft.
/// </summary>
public static class QuizDraftVisibility
{
    /// <summary>
    /// True when a non-owner reviewer may see this Draft quiz:
    /// submitted Pending, SchoolApproved, Approved (awaiting publish), or Rejected.
    /// </summary>
    public static bool IsVisibleToNonOwner(string? approvalName, bool hasSubmittedForReview)
    {
        if (LookupNames.IsSchoolApprovedName(approvalName)
            || LookupNames.IsFinalApprovedName(approvalName)
            || LookupNames.IsRejectedApprovalName(approvalName))
        {
            return true;
        }

        return LookupNames.IsPendingApprovalName(approvalName) && hasSubmittedForReview;
    }
}
