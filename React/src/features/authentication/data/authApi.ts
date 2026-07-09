import {
  apiRequest,
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

export async function getCurrentUser(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>("/auth/me");
}

export interface RegisterAccountRequest {
  fullName: string;
  mobileNumber: string;
  emailAddress?: string | null;
  userType: "Student" | "Parent" | "Teacher";
  schoolCampusName?: string | null;
  studentOrEmployeeId?: string | null;
  adminTarget: string;
  reasonMessage?: string | null;
  schoolId?: number | null;
  campusId?: number | null;
  cnic?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RegisterAccountResponse {
  id: number;
  username: string;
  fullName: string;
  role: string;
}

export async function requestPasswordReset(username: string): Promise<void> {
  await apiRequestVoid("/auth/password-reset/request", {
    method: "POST",
    body: { username },
    skipAuth: true,
  });
}

export async function registerAccount(
  request: RegisterAccountRequest,
): Promise<RegisterAccountResponse> {
  return apiRequest<RegisterAccountResponse>("/auth/register", {
    method: "POST",
    body: request,
    skipAuth: true,
  });
}

export async function changePassword(
  request: ChangePasswordRequest,
): Promise<CurrentUser> {
  return apiRequest<CurrentUser>("/auth/change-password", {
    method: "POST",
    body: request,
  });
}
