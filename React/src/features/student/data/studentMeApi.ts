import { apiRequest } from "@/core/api/apiClient";
import type { StudentMeOverview } from "@/features/student/domain/studentMeTypes";

export async function getStudentMeOverview(): Promise<StudentMeOverview> {
  return apiRequest<StudentMeOverview>("/students/me/overview");
}
