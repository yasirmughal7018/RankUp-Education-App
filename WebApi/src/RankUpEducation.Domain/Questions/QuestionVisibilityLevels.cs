namespace RankUpEducation.Domain.Questions;

/// <summary>
/// Who can see/use an Approved question after bank approval.
/// Campus &lt; School &lt; Public (higher levels include lower audiences).
/// Set by approver role: CampusAdmin → Campus, SchoolAdmin → School, PortalAdmin → Public.
/// </summary>
public static class QuestionVisibilityLevels
{
    /// <summary>Not approved / rejected / pending — not visible in the bank for others.</summary>
    public const short None = 0;

    /// <summary>Visible to the same campus (and SchoolAdmin of that school).</summary>
    public const short Campus = 1;

    /// <summary>Visible to all campuses in the owning school.</summary>
    public const short School = 2;

    /// <summary>Visible to everyone (portal-wide).</summary>
    public const short Public = 3;

    /// <summary>Maps stored short to API display name (None | Campus | School | Public).</summary>
    public static string ToName(short level) => level switch
    {
        Campus => "Campus",
        School => "School",
        Public => "Public",
        _ => "None"
    };

    /// <summary>True when level is Campus, School, or Public (valid after Approve).</summary>
    public static bool IsValidApprovedLevel(short level)
        => level is Campus or School or Public;
}
