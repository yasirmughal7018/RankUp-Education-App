using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Students;

public sealed class Student : SoftDeleteEntity
{
    private Student()
    {
    }

    public Student(long userId, short grade, string section, string? mobileNumber = null)
    {
        Id = userId;
        Grade = grade;
        Section = section.AsTrimmedString();
        MobileNumber = mobileNumber.AsTrimmedOrNull();
    }

    public string? MobileNumber { get; private set; }
    public short Grade { get; private set; }
    public string Section { get; private set; } = string.Empty;
    public DateTimeOffset ModifiedDate { get; private set; } = DateTimeOffset.UtcNow;

    public void Update(short grade, string section, string? mobileNumber)
    {
        Grade = grade;
        Section = section.AsTrimmedString();
        MobileNumber = mobileNumber.AsTrimmedOrNull();
        ModifiedDate = DateTimeOffset.UtcNow;
    }
}
