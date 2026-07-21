/**
 * Authentication HTTP client — login, tokens, profile, registration options.
 */
import {
  apiRequest,
  apiRequestForm,
  apiRequestVoid,
} from "@/core/api/apiClient";
import type {
  AuthSession,
  AuthTokensResponse,
  CurrentUser,
  LoginResponse,
} from "@/core/api/types";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SetInitialPasswordRequest {
  username: string;
  newPassword: string;
}

export type LoginStatus =
  | "PendingApproval"
  | "NeedsPasswordSetup"
  | "Ready"
  | "Rejected"
  | "LockedPendingSchoolChange";

export interface LoginStatusResponse {
  status: LoginStatus;
  message: string;
}

/** Pre-login gate: approval state, password setup, lock, etc. */
export async function getLoginStatus(
  username: string,
): Promise<LoginStatusResponse> {
  return apiRequest<LoginStatusResponse>("/auth/login-status", {
    method: "POST",
    body: { username },
    skipAuth: true,
  });
}

/** Authenticate and return a full session (tokens + user). */
export async function login(request: LoginRequest): Promise<AuthSession> {
  const response = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: request,
    skipAuth: true,
  });

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    user: response.user,
  };
}

/** Switch active role; returns new tokens and user snapshot. */
export async function switchRole(role: string): Promise<AuthSession> {
  const response = await apiRequest<LoginResponse>("/auth/switch-role", {
    method: "POST",
    body: { role },
  });

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    user: response.user,
  };
}

/** After approval: set password only. Does not create a session — user must sign in next. */
export async function setInitialPassword(
  request: SetInitialPasswordRequest,
): Promise<void> {
  await apiRequestVoid("/auth/set-initial-password", {
    method: "POST",
    body: request,
    skipAuth: true,
  });
}

/** Exchange refresh token for a new access/refresh pair. */
export async function refreshTokens(
  refreshToken: string,
): Promise<AuthTokensResponse> {
  return apiRequest<AuthTokensResponse>("/auth/token/refresh", {
    method: "POST",
    body: { refreshToken },
    skipAuth: true,
    skipAuthRefresh: true,
  });
}

/** Revoke refresh token server-side (no-op when token missing). */
export async function logout(refreshToken: string | null): Promise<void> {
  if (!refreshToken) {
    return;
  }

  await apiRequestVoid("/auth/logout", {
    method: "POST",
    body: { refreshToken },
    skipAuth: true,
  });
}

/** Fetch current user profile (validates stored access token). */
export async function getCurrentUser(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>("/auth/me");
}

export interface UpdateProfileRequest {
  fullName: string;
  mobileNumber: string;
  emailAddress?: string | null;
  cnic?: string | null;
}

/** Update profile fields on the authenticated account. */
export async function updateProfile(
  request: UpdateProfileRequest,
): Promise<CurrentUser> {
  return apiRequest<CurrentUser>("/auth/me", {
    method: "PUT",
    body: request,
  });
}

export interface RequestSchoolChangeRequest {
  schoolId?: number | null;
  campusId?: number | null;
}

export interface RequestSchoolChangeResponse {
  requestId: number;
  isLocked: boolean;
  message: string;
}

/** Submit a school/campus change request (may lock the account). */
export async function requestSchoolChange(
  request: RequestSchoolChangeRequest,
): Promise<RequestSchoolChangeResponse> {
  return apiRequest<RequestSchoolChangeResponse>("/auth/me/school-change", {
    method: "POST",
    body: request,
  });
}

/** Upload profile avatar (multipart). */
export async function uploadAvatar(file: File): Promise<CurrentUser> {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequestForm<CurrentUser>("/auth/me/avatar", formData);
}

export interface DeactivateAccountRequest {
  currentPassword: string;
}

/** Self-service account deactivation (requires current password). */
export async function deactivateAccount(
  request: DeactivateAccountRequest,
): Promise<void> {
  await apiRequestVoid("/auth/me/deactivate", {
    method: "POST",
    body: request,
  });
}

export interface RegisterAccountRequest {
  fullName: string;
  mobileNumber: string;
  emailAddress?: string | null;
  userType: "Student" | "Parent" | "Teacher";
  rollNumberTeacherCode?: string | null;
  reasonMessage?: string | null;
  schoolId?: number | null;
  campusId?: number | null;
  cnic?: string | null;
}

export interface ChangePasswordRequest {
  newPassword: string;
  currentPassword?: string | null;
}

export interface RegisterAccountResponse {
  id: number;
  username: string;
  fullName: string;
  role: string;
}

export interface RegistrationSchoolOption {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
}

export interface RegistrationCampusOption {
  id: number;
  schoolId: number;
  name: string;
  address: string | null;
  isActive: boolean;
}

/** Schools available during public self-registration. */
export async function listRegistrationSchools(): Promise<
  RegistrationSchoolOption[]
> {
  const response = await apiRequest<{ items: RegistrationSchoolOption[] }>(
    "/auth/registration-options/schools",
    { skipAuth: true },
  );
  return response.items;
}

/** Campuses for a school on the registration form. */
export async function listRegistrationCampuses(
  schoolId: number,
): Promise<RegistrationCampusOption[]> {
  const response = await apiRequest<{ items: RegistrationCampusOption[] }>(
    `/auth/registration-options/schools/${schoolId}/campuses`,
    { skipAuth: true },
  );
  return response.items;
}

/** Request a password reset email/workflow for the username. */
export async function requestPasswordReset(username: string): Promise<void> {
  await apiRequestVoid("/auth/password-reset/request", {
    method: "POST",
    body: { username },
    skipAuth: true,
  });
}

/** Admin: clear password after a forgot-password request (user then uses set-initial-password). */
export async function clearPasswordForReset(username: string): Promise<void> {
  await apiRequestVoid("/auth/password-reset/clear", {
    method: "POST",
    body: { username },
  });
}

/** Public self-registration (Student, Parent, or Teacher). */
export async function registerAccount(
  request: RegisterAccountRequest,
): Promise<RegisterAccountResponse> {
  return apiRequest<RegisterAccountResponse>("/auth/register", {
    method: "POST",
    body: request,
    skipAuth: true,
  });
}

/** Change password for the authenticated user. */
export async function changePassword(
  request: ChangePasswordRequest,
): Promise<CurrentUser> {
  return apiRequest<CurrentUser>("/auth/change-password", {
    method: "POST",
    body: request,
  });
}
