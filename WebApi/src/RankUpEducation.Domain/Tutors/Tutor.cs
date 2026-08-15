using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Tutors;

public sealed class Tutor : SoftDeleteEntity
{
    private Tutor()
    {
    }

    public Tutor(long userId, string? mobileNumber = null)
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
