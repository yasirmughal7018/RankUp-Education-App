/** Admin client for additional-role requests. */
import { apiRequest, apiRequestVoid } from "@/core/api/apiClient";

export interface PendingRoleRequestItem {
  id: number;
  userId: number;
  fullName: string;
  username: string;
  activeRole: string;
  existingRoles: string[];
  requestedRole: string;
  schoolId: number | null;
  campusId: number | null;
  teacherCode: string | null;
  reasonMessage: string | null;
  requestedAt: string;
}

export async function listPendingRoleRequests(
  take = 50,
): Promise<PendingRoleRequestItem[]> {
  return apiRequest<PendingRoleRequestItem[]>(
    `/auth/role-requests/pending?take=${take}`,
  );
}

export async function approveRoleRequest(requestId: number): Promise<void> {
  await apiRequestVoid(`/auth/role-requests/${requestId}/approve`, {
    method: "POST",
  });
}

export async function rejectRoleRequest(
  requestId: number,
  reason: string,
): Promise<void> {
  await apiRequestVoid(`/auth/role-requests/${requestId}/reject`, {
    method: "POST",
    body: { reason },
  });
}
