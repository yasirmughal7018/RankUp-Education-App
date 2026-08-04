/** Admin registration approval HTTP client. */
import {
  apiRequest,
  apiRequestVoid,
} from "@/core/api/apiClient";
import type { PendingRegistration } from "@/features/admin/domain/registrationTypes";

/** Accounts awaiting admin approval. */
export async function listPendingRegistrations(
  take = 50,
): Promise<PendingRegistration[]> {
  return apiRequest<PendingRegistration[]>(
    `/auth/registrations/pending?take=${take}`,
  );
}

/** Approve and optionally activate account. */
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

/** Reject a pending registration with a required reason. */
export async function rejectRegistration(
  userId: number,
  reason: string,
): Promise<void> {
  await apiRequestVoid(`/auth/registrations/${userId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
