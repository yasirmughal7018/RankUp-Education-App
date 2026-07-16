import { apiRequest, apiRequestVoid } from "@/core/api/apiClient";

export interface PendingSchoolChangeItem {
  id: number;
  userId: number;
  fullName: string;
  username: string;
  requesterRole: string;
  fromSchoolId: number | null;
  fromCampusId: number | null;
  toSchoolId: number | null;
  toCampusId: number | null;
  requestedAt: string;
  approvers: Array<{
    userId: number;
    fullName: string;
    username: string;
    role: string;
  }>;
  currentUserHasApproved: boolean;
}

export interface ApproveSchoolChangeResult {
  requestId: number;
  userId: number;
  isApplied: boolean;
  message: string;
}

export async function listPendingSchoolChanges(
  take = 50,
): Promise<PendingSchoolChangeItem[]> {
  return apiRequest<PendingSchoolChangeItem[]>(
    `/auth/school-changes/pending?take=${take}`,
  );
}

export async function approveSchoolChange(
  requestId: number,
): Promise<ApproveSchoolChangeResult> {
  return apiRequest<ApproveSchoolChangeResult>(
    `/auth/school-changes/${requestId}/approve`,
    { method: "POST" },
  );
}

export async function rejectSchoolChange(requestId: number): Promise<void> {
  await apiRequestVoid(`/auth/school-changes/${requestId}/reject`, {
    method: "POST",
  });
}
