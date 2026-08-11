/** Combinable directory roles that can be granted or removed together. */
export type DirectoryCombinableRole = "Parent" | "Teacher" | "Coordinator";

export const DIRECTORY_COMBINABLE_ROLES: DirectoryCombinableRole[] = [
  "Parent",
  "Teacher",
  "Coordinator",
];

export type DirectoryRoleContext = "teachers" | "parents" | "coordinators";

/**
 * Companion roles that can be removed from the current directory view.
 * - Single-role accounts: nothing removable
 * - Teachers page: Parent / Coordinator only (not Teacher)
 * - Parents page: Teacher / Coordinator only (not Parent)
 * - Coordinators page: Teacher / Parent only (not Coordinator)
 */
export function getRemovableDirectoryRoles(
  roles: string[] | null | undefined,
  primaryRole: DirectoryCombinableRole,
): DirectoryCombinableRole[] {
  const assigned = roles ?? [];
  if (assigned.length <= 1) {
    return [];
  }

  return DIRECTORY_COMBINABLE_ROLES.filter(
    (role) => role !== primaryRole && assigned.includes(role),
  );
}
