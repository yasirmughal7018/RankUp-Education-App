import { apiRequest, apiRequestVoid } from "@/core/api/apiClient";
import type {
  ChildQuizHistory,
  LinkMyChildInput,
  LinkMyChildResult,
  LinkedStudent,
  ParentGroup,
} from "@/features/parent/domain/parentTypes";

export async function listLinkedStudents(): Promise<LinkedStudent[]> {
  const response = await apiRequest<{ items: LinkedStudent[] }>(
    "/parents/me/students",
  );

  return response.items;
}

/** Link a student to the signed-in parent by CNIC or username. */
export async function linkMyChild(
  input: LinkMyChildInput,
): Promise<LinkMyChildResult> {
  return apiRequest<LinkMyChildResult>("/parents/me/students", {
    method: "POST",
    body: {
      identifier: input.identifier.trim(),
      relationship: input.relationship?.trim() || "Guardian",
    },
  });
}

export async function getChildQuizHistory(
  studentId: number,
): Promise<ChildQuizHistory> {
  return apiRequest<ChildQuizHistory>(
    `/reports/students/${studentId}/quiz-history`,
  );
}

export async function listMyGroups(): Promise<ParentGroup[]> {
  const response = await apiRequest<{ items: ParentGroup[] }>(
    "/parents/me/groups",
  );
  return response.items;
}

export async function createGroup(input: {
  groupName: string;
  description?: string;
}): Promise<ParentGroup> {
  return apiRequest<ParentGroup>("/parents/me/groups", {
    method: "POST",
    body: {
      groupName: input.groupName.trim(),
      description: input.description?.trim() || "",
    },
  });
}

export async function updateGroup(
  groupId: number,
  input: { groupName: string; description?: string },
): Promise<ParentGroup> {
  return apiRequest<ParentGroup>(`/parents/me/groups/${groupId}`, {
    method: "PUT",
    body: {
      groupName: input.groupName.trim(),
      description: input.description?.trim() || "",
    },
  });
}

export async function deleteGroup(groupId: number): Promise<void> {
  await apiRequestVoid(`/parents/me/groups/${groupId}`, {
    method: "DELETE",
  });
}

export async function addGroupMember(
  groupId: number,
  studentId: number,
): Promise<ParentGroup> {
  return apiRequest<ParentGroup>(`/parents/me/groups/${groupId}/members`, {
    method: "POST",
    body: { studentId },
  });
}

export async function removeGroupMember(
  groupId: number,
  studentId: number,
): Promise<void> {
  await apiRequestVoid(`/parents/me/groups/${groupId}/members/${studentId}`, {
    method: "DELETE",
  });
}
