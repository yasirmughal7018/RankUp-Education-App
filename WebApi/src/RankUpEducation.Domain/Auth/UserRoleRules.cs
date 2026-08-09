using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Auth;

/// <summary>Which role combinations are allowed on one account.</summary>
public static class UserRoleRules
{
    /// <summary>
    /// Roles that may share one login (any subset).
    /// Student, PortalAdmin, and SchoolAdmin stay exclusive.
    /// </summary>
    private static readonly HashSet<UserRole> CombinableRoles =
    [
        UserRole.CampusAdmin,
        UserRole.Teacher,
        UserRole.Parent,
        UserRole.Coordinator,
    ];

    /// <summary>Returns whether the role may be added given existing assignments.</summary>
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

        // SchoolAdmin is exclusive — one role only, never with Teacher/Parent/Coordinator/etc.
        if (roleToAdd == UserRole.SchoolAdmin || existingRoles.Contains(UserRole.SchoolAdmin))
        {
            return existingRoles.Count == 0 && roleToAdd == UserRole.SchoolAdmin;
        }

        // CampusAdmin, Teacher, Parent, Coordinator may share one account.
        return CombinableRoles.Contains(roleToAdd)
            && existingRoles.All(CombinableRoles.Contains);
    }

    /// <summary>Throws when the role combination would violate account rules.</summary>
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

        if (existingRoles.Contains(UserRole.SchoolAdmin) || roleToAdd == UserRole.SchoolAdmin)
        {
            throw new BusinessRuleException(
                "School Admin accounts cannot be combined with other roles. Use a separate login for School Admin.");
        }

        throw new BusinessRuleException($"Cannot add role {roleToAdd} to this account.");
    }

    /// <summary>
    /// Self-service removals are limited to Parent/Teacher when another role remains.
    /// </summary>
    public static bool CanRemoveRole(IReadOnlyCollection<UserRole> existingRoles, UserRole roleToRemove)
    {
        if (!existingRoles.Contains(roleToRemove))
        {
            return false;
        }

        if (existingRoles.Count <= 1)
        {
            return false;
        }

        return roleToRemove is UserRole.Parent or UserRole.Teacher;
    }

    /// <summary>Throws when the role cannot be removed from this account.</summary>
    public static void EnsureCanRemoveRole(IReadOnlyCollection<UserRole> existingRoles, UserRole roleToRemove)
    {
        if (CanRemoveRole(existingRoles, roleToRemove))
        {
            return;
        }

        if (!existingRoles.Contains(roleToRemove))
        {
            throw new BusinessRuleException($"This account does not have the {roleToRemove} role.");
        }

        if (existingRoles.Count <= 1)
        {
            throw new BusinessRuleException("You cannot remove your only role.");
        }

        throw new BusinessRuleException(
            "Only Parent or Teacher can be removed from your profile. Contact an admin for other role changes.");
    }
}
