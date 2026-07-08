import { apiRequest } from "@/core/api/apiClient";
import type {
  ChildQuizHistory,
  LinkedStudent,
} from "@/features/parent/domain/parentTypes";

export async function listLinkedStudents(): Promise<LinkedStudent[]> {
  const response = await apiRequest<{ items: LinkedStudent[] }>(
    "/parents/me/students",
  );

  return response.items;
}

export async function getChildQuizHistory(
  studentId: number,
): Promise<ChildQuizHistory> {
  return apiRequest<ChildQuizHistory>(
    `/reports/students/${studentId}/quiz-history`,
  );
}
