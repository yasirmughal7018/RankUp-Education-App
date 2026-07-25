namespace RankUpEducation.Domain.Questions;

/// <summary>
/// Endorsement / publish markers after bank approval.
/// CampusAdmin → Campus (endorsed, restricted), SchoolAdmin → School (endorsed, restricted),
/// PortalAdmin → Public (published, broadly visible and quiz-usable).
/// None / Campus / School share the same restricted audience (creator + upward admins);
/// only Public widens the audience.
/// </summary>
public static class QuestionVisibilityLevels
{
    /// <summary>Pending / rejected — restricted to creator + upward admins.</summary>
    public const short None = 0;

    /// <summary>CampusAdmin endorsement marker (still restricted; not quiz-usable).</summary>
    public const short Campus = 1;

    /// <summary>SchoolAdmin endorsement marker (still restricted; not quiz-usable).</summary>
    public const short School = 2;

    /// <summary>PortalAdmin publish — visible to all question-managing roles; quiz-usable when Active.</summary>
    public const short Public = 3;

    /// <summary>Maps stored short to API display name (None | Campus | School | Public).</summary>
    public static string ToName(short level) => level switch
    {
        Campus => "Campus",
        School => "School",
        Public => "Public",
        _ => "None"
    };

    /// <summary>True when level is Campus, School, or Public (valid after Approve/endorse).</summary>
    public static bool IsValidApprovedLevel(short level)
        => level is Campus or School or Public;

    /// <summary>True when PortalAdmin has published the question.</summary>
    public static bool IsPublished(short level) => level == Public;
}
