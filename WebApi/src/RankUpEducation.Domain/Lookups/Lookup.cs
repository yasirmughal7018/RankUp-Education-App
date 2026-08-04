using RankUpEducation.Common.Utilities;

namespace RankUpEducation.Domain.Lookups;

/// <summary>Reference data row (status, type, grade label, etc.) keyed by <see cref="Type"/> and <see cref="Id"/>.</summary>
public sealed class Lookup
{
    private Lookup()
    {
        Name = string.Empty;
        Type = string.Empty;
    }

    public Lookup(short id, string name, string type, short orderBy = 0, short? lookupRefId = null)
    {
        Id = id;
        Name = name.AsTrimmedString();
        Type = type.AsTrimmedString();
        OrderBy = orderBy;
        LookupRefId = lookupRefId;
    }

    public short Id { get; private set; }
    public string Name { get; private set; }
    public string Type { get; private set; }
    public short OrderBy { get; private set; }
    public bool IsActive { get; private set; } = true;
    public short? LookupRefId { get; private set; }
}
