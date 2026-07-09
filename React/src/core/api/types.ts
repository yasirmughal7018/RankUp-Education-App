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
  | "SuperAdmin"
  | "SchoolAdmin"
  | "Teacher"
  | "Student"
  | "Parent";

export interface CurrentUser {
  id: number;
  username: string;
  fullName: string;
  name: string;
  role: UserRole;
  profileId: number | null;
  schoolId: number | null;
  campusId: number | null;
  permissions: string[];
  mustChangePassword: boolean;
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

export const ADMIN_ROLES: UserRole[] = ["SuperAdmin", "SchoolAdmin"];

export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function getDashboardLabel(role: UserRole): string {
  switch (role) {
    case "SuperAdmin":
      return "Platform Administration";
    case "SchoolAdmin":
      return "School Administration";
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
