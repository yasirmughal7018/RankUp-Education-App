import {
  apiRequest,
  apiRequestVoid,
} from "@/core/api/apiClient";
import type { PendingRegistration } from "@/features/admin/domain/registrationTypes";

export async function listPendingRegistrations(
  take = 50,
): Promise<PendingRegistration[]> {
  return apiRequest<PendingRegistration[]>(
    `/auth/registrations/pending?take=${take}`,
  );
}

export async function approveRegistration(
  userId: number,
): Promise<ApproveRegistrationResult> {
  return apiRequest<ApproveRegistrationResult>(
    `/auth/registrations/${userId}/approve`,
    {
      method: "POST",
    },
  );
}

export interface ApproveRegistrationResult {
  userId: number;
  username: string;
  fullName: string;
  isActivated: boolean;
  message: string;
}

export async function rejectRegistration(userId: number): Promise<void> {
  await apiRequestVoid(`/auth/registrations/${userId}/reject`, {
    method: "POST",
  });
}
