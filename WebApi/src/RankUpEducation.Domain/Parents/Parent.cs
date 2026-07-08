using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Parents;

public sealed class Parent : SoftDeleteEntity
{
    private Parent()
    {
    }

    public Parent(long userId, string? cnic, string? mobileNumber = null)
    {
        Id = userId;
        Cnic = cnic;
        MobileNumber = string.IsNullOrWhiteSpace(mobileNumber) ? null : mobileNumber.Trim();
    }

    public string? Cnic { get; private set; }
    public string? MobileNumber { get; private set; }
    public DateTimeOffset ModifiedDate { get; private set; } = DateTimeOffset.UtcNow;

    public void Update(string? cnic, string? mobileNumber)
    {
        Cnic = string.IsNullOrWhiteSpace(cnic) ? null : cnic.Trim();
        MobileNumber = string.IsNullOrWhiteSpace(mobileNumber) ? null : mobileNumber.Trim();
        ModifiedDate = DateTimeOffset.UtcNow;
    }
}
