import { apiRequest } from "@/core/api/apiClient";
import type {
  ChildQuizHistory,
  LinkMyChildInput,
  LinkMyChildResult,
  LinkedStudent,
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
