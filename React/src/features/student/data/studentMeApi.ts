import { apiRequest } from "@/core/api/apiClient";
import type {
  StudentClassHistory,
  StudentMeOverview,
} from "@/features/student/domain/studentMeTypes";

export async function getStudentMeOverview(): Promise<StudentMeOverview> {
  return apiRequest<StudentMeOverview>("/students/me/overview");
}

export async function getStudentMeClassHistory(): Promise<StudentClassHistory> {
  return apiRequest<StudentClassHistory>("/students/me/class-history");
}
