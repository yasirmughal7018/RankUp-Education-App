/** Admin school/campus change request HTTP client. */
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
  schoolAdminHasApproved: boolean;
}

export interface ApproveSchoolChangeResult {
  requestId: number;
  userId: number;
  isApplied: boolean;
  message: string;
}

/** Pending school/campus move requests. */
export async function listPendingSchoolChanges(
  take = 50,
): Promise<PendingSchoolChangeItem[]> {
  return apiRequest<PendingSchoolChangeItem[]>(
    `/auth/school-changes/pending?take=${take}`,
  );
}

/** Approve change (multi-approver workflow). */
export async function approveSchoolChange(
  requestId: number,
): Promise<ApproveSchoolChangeResult> {
  return apiRequest<ApproveSchoolChangeResult>(
    `/auth/school-changes/${requestId}/approve`,
    { method: "POST" },
  );
}

/** Reject a school change request. Optionally clear school for the student. */
export async function rejectSchoolChange(
  requestId: number,
  leaveWithoutSchool = false,
): Promise<void> {
  const query = leaveWithoutSchool ? "?leaveWithoutSchool=true" : "";
  await apiRequestVoid(`/auth/school-changes/${requestId}/reject${query}`, {
    method: "POST",
  });
}
