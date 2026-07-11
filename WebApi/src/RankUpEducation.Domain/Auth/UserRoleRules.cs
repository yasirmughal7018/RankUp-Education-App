using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Auth;

/// <summary>Which role combinations are allowed on one account.</summary>
public static class UserRoleRules
{
    public static bool CanAddRole(IReadOnlyCollection<UserRole> existingRoles, UserRole roleToAdd)
    {
        if (existingRoles.Contains(roleToAdd))
        {
            return false;
        }

        // Student is exclusive — cannot combine with any other role.
        if (roleToAdd == UserRole.Student || existingRoles.Contains(UserRole.Student))
        {
            return existingRoles.Count == 0 && roleToAdd == UserRole.Student;
        }

        // PortalAdmin is exclusive.
        if (roleToAdd == UserRole.PortalAdmin || existingRoles.Contains(UserRole.PortalAdmin))
        {
            return existingRoles.Count == 0 && roleToAdd == UserRole.PortalAdmin;
        }

        // SchoolAdmin, CampusAdmin, Teacher, Parent may combine freely.
        return roleToAdd is UserRole.SchoolAdmin
            or UserRole.CampusAdmin
            or UserRole.Teacher
            or UserRole.Parent;
    }

    public static void EnsureCanAddRole(IReadOnlyCollection<UserRole> existingRoles, UserRole roleToAdd)
    {
        if (CanAddRole(existingRoles, roleToAdd))
        {
            return;
        }

        if (existingRoles.Contains(roleToAdd))
        {
            throw new BusinessRuleException($"This account already has the {roleToAdd} role.");
        }

        if (existingRoles.Contains(UserRole.Student) || roleToAdd == UserRole.Student)
        {
            throw new BusinessRuleException("Student accounts cannot be combined with other roles.");
        }

        if (existingRoles.Contains(UserRole.PortalAdmin) || roleToAdd == UserRole.PortalAdmin)
        {
            throw new BusinessRuleException("Portal Admin accounts cannot be combined with other roles.");
        }

        throw new BusinessRuleException($"Cannot add role {roleToAdd} to this account.");
    }
}
