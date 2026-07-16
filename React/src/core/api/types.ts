export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[];
}

export interface ApiError {
  message: string;
  status?: number;
  errors?: string[];
}

export type UserRole =
  | "PortalAdmin"
  | "SchoolAdmin"
  | "CampusAdmin"
  | "Teacher"
  | "Student"
  | "Parent";

export interface PendingSchoolChange {
  id: number;
  toSchoolId: number | null;
  toCampusId: number | null;
  requestedAt: string;
  status: string;
}

export interface CurrentUser {
  id: number;
  username: string;
  fullName: string;
  name: string;
  role: UserRole;
  /** All roles on this account. Active role is `role`. */
  roles: UserRole[];
  profileId: number | null;
  schoolId: number | null;
  campusId: number | null;
  emailAddress?: string | null;
  mobileNumber?: string | null;
  cnic?: string | null;
  avatarUrl?: string | null;
  pendingSchoolChange?: PendingSchoolChange | null;
  permissions: string[];
  mustChangePassword?: boolean | null;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokensResponse {
  user: CurrentUser;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: CurrentUser;
}

export const ADMIN_ROLES: UserRole[] = [
  "PortalAdmin",
  "SchoolAdmin",
  "CampusAdmin",
];

export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function getDashboardLabel(role: UserRole): string {
  switch (role) {
    case "PortalAdmin":
      return "Platform Administration";
    case "SchoolAdmin":
      return "School Administration";
    case "CampusAdmin":
      return "Campus Administration";
    case "Teacher":
      return "Teacher Dashboard";
    case "Student":
      return "Student Dashboard";
    case "Parent":
      return "Parent Dashboard";
    default:
      return "Dashboard";
  }
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "PortalAdmin":
      return "Portal Admin";
    case "SchoolAdmin":
      return "School Admin";
    case "CampusAdmin":
      return "Campus Admin";
    default:
      return role;
  }
}

export function dashboardPathForRole(role: UserRole): string {
  if (isAdminRole(role)) {
    return "/admin";
  }
  if (role === "Parent") {
    return "/parent/children";
  }
  if (role === "Student") {
    return "/student/quizzes";
  }
  if (role === "Teacher") {
    return "/quizzes";
  }
  return "/dashboard";
}

/** Normalize API user payloads that may omit `roles` (older sessions). */
export function normalizeCurrentUser(user: CurrentUser): CurrentUser {
  const roles =
    Array.isArray(user.roles) && user.roles.length > 0
      ? user.roles
      : [user.role];
  return { ...user, roles };
}
