using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Schools;

public sealed class School : SoftDeleteEntity
{
    private School()
    {
        Name = string.Empty;
        Code = string.Empty;
    }

    public School(string name, string code)
    {
        Name = name.AsTrimmedString();
        Code = code.AsTrimmedString();
    }

    public string Name { get; private set; }
    public string Code { get; private set; }
    public bool IsActive { get; private set; } = true;

    public void Update(string name, string code)
    {
        Name = name.AsTrimmedString();
        Code = code.AsTrimmedString();
    }

    public void SetActive(bool isActive)
    {
        IsActive = isActive;
    }
}
