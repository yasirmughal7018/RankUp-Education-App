/** Combinable directory roles that can be granted or removed together. */
export type DirectoryCombinableRole =
  | "Parent"
  | "Teacher"
  | "Coordinator"
  | "Tutor";

export const DIRECTORY_COMBINABLE_ROLES: DirectoryCombinableRole[] = [
  "Parent",
  "Teacher",
  "Coordinator",
  "Tutor",
];

export type DirectoryRoleContext =
  | "teachers"
  | "parents"
  | "coordinators"
  | "tutors";

/**
 * Companion roles that can be removed from the current directory view.
 * The primary role for that page is never removable here.
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
