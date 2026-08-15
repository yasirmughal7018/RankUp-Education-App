import { apiRequest, apiRequestVoid } from "@/core/api/apiClient";
import type {
  LinkTutorStudentInput,
  LinkTutorStudentResult,
  TutorLinkedStudent,
} from "@/features/tutor/domain/tutorTypes";
import type { ChildQuizHistory } from "@/features/parent/domain/parentTypes";

export async function listLinkedStudents(): Promise<TutorLinkedStudent[]> {
  const response = await apiRequest<{ items: TutorLinkedStudent[] }>(
    "/tutors/me/students",
  );
  return response.items;
}

export async function linkStudent(
  input: LinkTutorStudentInput,
): Promise<LinkTutorStudentResult> {
  return apiRequest<LinkTutorStudentResult>("/tutors/me/students", {
    method: "POST",
    body: { identifier: input.identifier.trim() },
  });
}

export async function unlinkStudent(studentId: number): Promise<void> {
  await apiRequestVoid(`/tutors/me/students/${studentId}`, {
    method: "DELETE",
  });
}

export async function getStudentQuizHistory(
  studentId: number,
): Promise<ChildQuizHistory> {
  return apiRequest<ChildQuizHistory>(
    `/reports/students/${studentId}/quiz-history`,
  );
}
