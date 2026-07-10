using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Parents;

public sealed class Parent : SoftDeleteEntity
{
    private Parent()
    {
    }

    public Parent(long userId, string? mobileNumber = null)
    {
        Id = userId;
        MobileNumber = mobileNumber.AsTrimmedOrNull();
    }

    public string? MobileNumber { get; private set; }
    public DateTimeOffset ModifiedDate { get; private set; } = DateTimeOffset.UtcNow;

    public void Update(string? mobileNumber)
    {
        MobileNumber = mobileNumber.AsTrimmedOrNull();
        ModifiedDate = DateTimeOffset.UtcNow;
    }
}
