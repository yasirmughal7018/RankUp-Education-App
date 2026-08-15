using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Coordinators;

/// <summary>
/// A whole class (grade) a coordinator oversees. Section is always stored as
/// <see cref="FullClassSectionMarker"/> (all sections of that grade).
/// </summary>
public sealed class CoordinatorClassSection : BaseEntity
{
    /// <summary>Stored in <see cref="Section"/> when the assignment covers the whole grade.</summary>
    public const string FullClassSectionMarker = "*";

    private CoordinatorClassSection()
    {
        Section = string.Empty;
    }

    public CoordinatorClassSection(long coordinatorUserId, short grade, string section)
    {
        CoordinatorUserId = coordinatorUserId;
        Grade = grade;
        Section = NormalizeSection(section);
    }

    public static CoordinatorClassSection ForFullClass(long coordinatorUserId, short grade)
        => new(coordinatorUserId, grade, FullClassSectionMarker);

    public static CoordinatorClassSection ForSection(long coordinatorUserId, short grade, string section)
        => new(coordinatorUserId, grade, section);

    public long CoordinatorUserId { get; private set; }
    public short Grade { get; private set; }
    public string Section { get; private set; }
    public bool IsActive { get; private set; } = true;

    public bool IsFullClass =>
        string.Equals(Section, FullClassSectionMarker, StringComparison.Ordinal);

    public void Activate() => IsActive = true;

    public void Deactivate() => IsActive = false;

    public static string NormalizeSection(string? section)
    {
        if (string.IsNullOrWhiteSpace(section))
        {
            return string.Empty;
        }

        var trimmed = section.Trim();
        if (string.Equals(trimmed, FullClassSectionMarker, StringComparison.Ordinal))
        {
            return FullClassSectionMarker;
        }

        return trimmed.AsTrimmedString();
    }

    public static bool IsFullClassSection(string? section)
        => string.Equals(section?.Trim(), FullClassSectionMarker, StringComparison.Ordinal);
}
