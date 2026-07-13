namespace RankUpEducation.Domain.Auth;

/// <summary>
/// Application roles. Numeric values match lookups.id for type = UserRole.
/// </summary>
public enum UserRole
{
    PortalAdmin = 2010,
    SchoolAdmin = 2011,
    CampusAdmin = 2012,
    Parent = 2013,
    Teacher = 2014,
    Student = 2015
}
