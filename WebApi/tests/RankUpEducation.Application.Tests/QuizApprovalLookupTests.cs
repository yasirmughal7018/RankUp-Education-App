using RankUpEducation.Application.Lookups;

namespace RankUpEducation.Application.Tests;

/// <summary>Approval status name helpers used by publish/approve/reject services.</summary>
public sealed class QuizApprovalLookupTests
{
    [Theory]
    [InlineData("Pending", true)]
    [InlineData("Under Review", true)]
    [InlineData("Approval Pending", true)]
    [InlineData("Pending Approval", true)]
    [InlineData(" Approval Pending ", true)]
    [InlineData("Draft", false)]
    [InlineData("SchoolApproved", false)]
    [InlineData("Approved", false)]
    public void IsPendingApprovalName_RecognizesQueueStates(string name, bool expected)
    {
        Assert.Equal(expected, LookupNames.IsPendingApprovalName(name));
    }

    [Fact]
    public void PendingApprovalStatusNames_IsCanonicalPendingOnly()
    {
        Assert.Equal(["Pending"], LookupNames.PendingApprovalStatusNames);
        Assert.DoesNotContain("Draft", LookupNames.PendingApprovalStatusNames);
        Assert.DoesNotContain("Approval Pending", LookupNames.PendingApprovalStatusNames);
    }

    [Fact]
    public void IsSubmittedDraftAwaitingReview_TreatsSubmittedDraftAsPending()
    {
        Assert.True(LookupNames.IsSubmittedDraftAwaitingReview(
            0,
            "Unknown",
            "Draft",
            hasSubmittedForReview: true));
        Assert.False(LookupNames.IsSubmittedDraftAwaitingReview(
            LookupNames.QuizApprovalStatusIds.Approved,
            "Approved",
            "Draft",
            hasSubmittedForReview: true));
        Assert.False(LookupNames.IsSubmittedDraftAwaitingReview(
            LookupNames.QuizApprovalStatusIds.Pending,
            "Pending",
            "Draft",
            hasSubmittedForReview: false));
    }

    [Fact]
    public void IsPendingApproval_RecognizesCanonicalIdEvenWhenNameIsUnknown()
    {
        Assert.True(LookupNames.IsPendingApproval(LookupNames.QuizApprovalStatusIds.Pending, "Unknown"));
        Assert.False(LookupNames.IsPendingApproval(LookupNames.QuizApprovalStatusIds.Approved, "Unknown"));
    }

    [Theory]
    [InlineData("SchoolApproved", true)]
    [InlineData("School Approved", true)]
    [InlineData("Pending", false)]
    public void IsSchoolApprovedName_RecognizesFirstTier(string name, bool expected)
    {
        Assert.Equal(expected, LookupNames.IsSchoolApprovedName(name));
    }

    [Theory]
    [InlineData("Approved", true)]
    [InlineData("APPROVED", true)]
    [InlineData("SchoolApproved", false)]
    public void IsFinalApprovedName_RecognizesPortalFinal(string name, bool expected)
    {
        Assert.Equal(expected, LookupNames.IsFinalApprovedName(name));
    }

    [Theory]
    [InlineData("Rejected", true)]
    [InlineData("Declined", true)]
    [InlineData("Cancelled", true)]
    [InlineData("Pending", false)]
    public void IsRejectedApprovalName_RecognizesDenialStates(string name, bool expected)
    {
        Assert.Equal(expected, LookupNames.IsRejectedApprovalName(name));
    }
}
