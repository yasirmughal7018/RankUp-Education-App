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
 * @param options.includeParent When false, Parent is not offered for removal (School/Campus Admin).
 * @param options.includeTutor When false, Tutor is not offered for removal (School/Campus Admin).
 */
export function getRemovableDirectoryRoles(
  roles: string[] | null | undefined,
  primaryRole: DirectoryCombinableRole,
  options?: { includeParent?: boolean; includeTutor?: boolean },
): DirectoryCombinableRole[] {
  const assigned = roles ?? [];
  if (assigned.length <= 1) {
    return [];
  }

  const includeParent = options?.includeParent !== false;
  const includeTutor = options?.includeTutor !== false;

  return DIRECTORY_COMBINABLE_ROLES.filter(
    (role) =>
      role !== primaryRole &&
      assigned.includes(role) &&
      (includeParent || role !== "Parent") &&
      (includeTutor || role !== "Tutor"),
  );
}

/**
 * Roles shown under the name on directory lists.
 * Omits Tutor always; when primaryRole is set, also omits that role so only companions show.
 */
export function formatDirectoryListDisplayRoles(
  roles: string[] | null | undefined,
  primaryRole?: string,
): string | null {
  const visible = (roles ?? []).filter(
    (role) => role !== "Tutor" && role !== primaryRole,
  );
  if (visible.length === 0) {
    return null;
  }
  return visible.join(", ");
}

/** @deprecated Prefer formatDirectoryListDisplayRoles */
export function formatTeacherListDisplayRoles(
  roles: string[] | null | undefined,
): string | null {
  return formatDirectoryListDisplayRoles(roles, "Teacher");
}
