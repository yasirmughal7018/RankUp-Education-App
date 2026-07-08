import { apiRequest, apiRequestVoid } from "@/core/api/apiClient";
import type {
  DirectoryCampus,
  DirectoryParent,
  DirectorySchool,
  DirectoryStudent,
  DirectoryStudentFilters,
  DirectoryTeacher,
  DirectoryTeacherFilters,
  LinkParentStudentInput,
  LinkParentStudentResult,
} from "@/features/directory/domain/directoryTypes";

function toQuery(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function listSchools(): Promise<DirectorySchool[]> {
  const response = await apiRequest<{ items: DirectorySchool[] }>(
    "/directory/schools",
  );
  return response.items;
}

export async function listCampuses(schoolId: number): Promise<DirectoryCampus[]> {
  const response = await apiRequest<{ items: DirectoryCampus[] }>(
    `/directory/schools/${schoolId}/campuses`,
  );
  return response.items;
}

export async function listStudents(
  filters: DirectoryStudentFilters = {},
): Promise<DirectoryStudent[]> {
  const response = await apiRequest<{ items: DirectoryStudent[] }>(
    `/directory/students${toQuery({
      schoolId: filters.schoolId,
      campusId: filters.campusId,
      grade: filters.grade,
      search: filters.search,
    })}`,
  );
  return response.items;
}

export async function listTeachers(
  filters: DirectoryTeacherFilters = {},
): Promise<DirectoryTeacher[]> {
  const response = await apiRequest<{ items: DirectoryTeacher[] }>(
    `/directory/teachers${toQuery({
      schoolId: filters.schoolId,
      campusId: filters.campusId,
      search: filters.search,
    })}`,
  );
  return response.items;
}

export async function listParents(search?: string): Promise<DirectoryParent[]> {
  const response = await apiRequest<{ items: DirectoryParent[] }>(
    `/directory/parents${toQuery({ search })}`,
  );
  return response.items;
}

export async function linkParentStudent(
  parentId: number,
  input: LinkParentStudentInput,
): Promise<LinkParentStudentResult> {
  return apiRequest<LinkParentStudentResult>(
    `/directory/parents/${parentId}/students`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function unlinkParentStudent(
  parentId: number,
  studentId: number,
): Promise<void> {
  await apiRequestVoid(`/directory/parents/${parentId}/students/${studentId}`, {
    method: "DELETE",
  });
}
