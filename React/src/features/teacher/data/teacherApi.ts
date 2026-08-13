import { apiRequest, apiRequestVoid } from "@/core/api/apiClient";
import type {
  TeacherGroup,
  TeacherRoster,
} from "@/features/teacher/domain/teacherTypes";

export async function getMyRoster(): Promise<TeacherRoster> {
  return apiRequest<TeacherRoster>("/teachers/me/roster");
}

export async function listMyGroups(): Promise<TeacherGroup[]> {
  const response = await apiRequest<{ items: TeacherGroup[] }>(
    "/teachers/me/groups",
  );
  return response.items;
}

export async function createGroup(input: {
  groupName: string;
  description?: string;
}): Promise<TeacherGroup> {
  return apiRequest<TeacherGroup>("/teachers/me/groups", {
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
): Promise<TeacherGroup> {
  return apiRequest<TeacherGroup>(`/teachers/me/groups/${groupId}`, {
    method: "PUT",
    body: {
      groupName: input.groupName.trim(),
      description: input.description?.trim() || "",
    },
  });
}

export async function deleteGroup(groupId: number): Promise<void> {
  await apiRequestVoid(`/teachers/me/groups/${groupId}`, {
    method: "DELETE",
  });
}

export async function addGroupMember(
  groupId: number,
  studentId: number,
): Promise<TeacherGroup> {
  return apiRequest<TeacherGroup>(`/teachers/me/groups/${groupId}/members`, {
    method: "POST",
    body: { studentId },
  });
}

export async function removeGroupMember(
  groupId: number,
  studentId: number,
): Promise<void> {
  await apiRequestVoid(
    `/teachers/me/groups/${groupId}/members/${studentId}`,
    { method: "DELETE" },
  );
}
