namespace RankUpEducation.Domain.Auth;

/// <summary>Lifecycle state of a school/campus change request.</summary>
public enum SchoolChangeRequestStatus : short
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
}
