using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Schools;

/// <summary>Top-level tenant organization that owns campuses and scoped directory data.</summary>
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

    /// <summary>Updates display name and unique code.</summary>
    public void Update(string name, string code)
    {
        Name = name.AsTrimmedString();
        Code = code.AsTrimmedString();
    }

    /// <summary>Activates or deactivates the school without deleting it.</summary>
    public void SetActive(bool isActive)
    {
        IsActive = isActive;
    }
}
