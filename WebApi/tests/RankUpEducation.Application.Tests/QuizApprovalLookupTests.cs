using RankUpEducation.Application.Lookups;

namespace RankUpEducation.Application.Tests;

/// <summary>Approval status name helpers used by publish/approve/reject services.</summary>
public sealed class QuizApprovalLookupTests
{
    [Theory]
    [InlineData("Pending", true)]
    [InlineData("Under Review", true)]
    [InlineData("SchoolApproved", false)]
    [InlineData("Approved", false)]
    public void IsPendingApprovalName_RecognizesQueueStates(string name, bool expected)
    {
        Assert.Equal(expected, LookupNames.IsPendingApprovalName(name));
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
