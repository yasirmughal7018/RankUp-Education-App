using RankUpEducation.Application.Lookups;

namespace RankUpEducation.Application.Quizzes;

/// <summary>User-facing list/manage status labels combining lifecycle + approval dimensions.</summary>
public static class QuizDisplayStatus
{
    public const string ApprovalPending = "Approval Pending";
    public const string Draft = "Draft";
    public const string SchoolApproved = "School Approved";
    public const string AwaitingPublish = "Awaiting Publish";
    public const string Rejected = "Rejected";

    /// <summary>
    /// Staff catalog cards: lifecycle Draft shows approval phase (not plain "Draft") once the quiz has questions.
    /// Lifecycle Published (including legacy Assigned) and Archived keep those names — Assigned displays as Published.
    /// </summary>
    public static string ResolveStaffListStatus(
        string? lifecycleStatusName,
        string? approvalStatusName,
        short totalQuestions = 0,
        bool hasSubmittedForReview = false)
    {
        var lifecycle = lifecycleStatusName?.Trim() ?? string.Empty;
        var approval = approvalStatusName?.Trim() ?? string.Empty;

        if (!IsDraftLifecycleName(lifecycle))
        {
            if (LookupNames.AssignedLifecycleNames.Any(
                    name => name.Equals(lifecycle, StringComparison.OrdinalIgnoreCase)))
            {
                return "Published";
            }

            return lifecycle;
        }

        if (LookupNames.IsRejectedApprovalName(approval))
        {
            return Rejected;
        }

        if (LookupNames.IsSchoolApprovedName(approval))
        {
            return SchoolApproved;
        }

        if (LookupNames.IsFinalApprovedName(approval))
        {
            return AwaitingPublish;
        }

        if (LookupNames.IsPendingApprovalName(approval))
        {
            return totalQuestions > 0 && hasSubmittedForReview ? ApprovalPending : Draft;
        }

        return Draft;
    }

    private static bool IsDraftLifecycleName(string lifecycleStatusName)
        => LookupNames.DraftLifecycleNames.Any(
            name => name.Equals(lifecycleStatusName, StringComparison.OrdinalIgnoreCase))
            || lifecycleStatusName.Equals("Not Assigned", StringComparison.OrdinalIgnoreCase);
}
