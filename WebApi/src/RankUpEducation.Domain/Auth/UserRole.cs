namespace RankUpEducation.Domain.Auth;

/// <summary>
/// Application roles. Numeric values match lookups.id for type = UserRole.
/// </summary>
public enum UserRole
{
    PortalAdmin = 2010,
    SchoolAdmin = 2011,
    Student = 2012,
    Teacher = 2013,
    Parent = 2014
}
