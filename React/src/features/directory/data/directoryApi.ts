import { apiRequest, apiRequestVoid } from "@/core/api/apiClient";
import type {
  BulkActionResult,
  BulkDeactivateInput,
  CreateDirectoryCampusAdminInput,
  CreateDirectoryParentInput,
  CreateDirectorySchoolAdminInput,
  CreateDirectoryStudentInput,
  CreateDirectoryTeacherInput,
  DirectoryCampus,
  DirectoryCampusAdmin,
  DirectoryCampusAdminFilters,
  DirectoryParent,
  DirectoryParentFilters,
  DirectorySchool,
  DirectorySchoolAdmin,
  DirectorySchoolAdminFilters,
  DirectoryStudent,
  DirectoryStudentFilters,
  DirectoryTeacher,
  DirectoryTeacherFilters,
  LinkParentStudentInput,
  LinkParentStudentResult,
  PagedDirectoryResult,
  UpdateDirectoryCampusAdminInput,
  UpdateDirectoryParentInput,
  UpdateDirectorySchoolAdminInput,
  UpdateDirectoryStudentInput,
  UpdateDirectoryTeacherInput,
  UpsertCampusInput,
  UpsertSchoolInput,
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

export async function createSchool(
  input: UpsertSchoolInput,
): Promise<DirectorySchool> {
  return apiRequest<DirectorySchool>("/directory/schools", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateSchool(
  schoolId: number,
  input: UpsertSchoolInput,
): Promise<DirectorySchool> {
  return apiRequest<DirectorySchool>(`/directory/schools/${schoolId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function activateSchool(schoolId: number): Promise<void> {
  await apiRequestVoid(`/directory/schools/${schoolId}/activate`, {
    method: "POST",
  });
}

export async function deactivateSchool(schoolId: number): Promise<void> {
  await apiRequestVoid(`/directory/schools/${schoolId}/deactivate`, {
    method: "POST",
  });
}

export async function listCampuses(schoolId: number): Promise<DirectoryCampus[]> {
  const response = await apiRequest<{ items: DirectoryCampus[] }>(
    `/directory/schools/${schoolId}/campuses`,
  );
  return response.items;
}

export async function createCampus(
  schoolId: number,
  input: UpsertCampusInput,
): Promise<DirectoryCampus> {
  return apiRequest<DirectoryCampus>(
    `/directory/schools/${schoolId}/campuses`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function updateCampus(
  campusId: number,
  input: UpsertCampusInput,
): Promise<DirectoryCampus> {
  return apiRequest<DirectoryCampus>(`/directory/campuses/${campusId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function activateCampus(campusId: number): Promise<void> {
  await apiRequestVoid(`/directory/campuses/${campusId}/activate`, {
    method: "POST",
  });
}

export async function deactivateCampus(campusId: number): Promise<void> {
  await apiRequestVoid(`/directory/campuses/${campusId}/deactivate`, {
    method: "POST",
  });
}

export async function listStudents(
  filters: DirectoryStudentFilters = {},
): Promise<PagedDirectoryResult<DirectoryStudent>> {
  return apiRequest<PagedDirectoryResult<DirectoryStudent>>(
    `/directory/students${toQuery({
      schoolId: filters.schoolId,
      campusId: filters.campusId,
      grade: filters.grade,
      search: filters.search,
      pageNumber: filters.pageNumber,
      pageSize: filters.pageSize,
    })}`,
  );
}

export async function createStudent(
  input: CreateDirectoryStudentInput,
): Promise<DirectoryStudent> {
  return apiRequest<DirectoryStudent>("/directory/students", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateStudent(
  studentId: number,
  input: UpdateDirectoryStudentInput,
): Promise<DirectoryStudent> {
  return apiRequest<DirectoryStudent>(`/directory/students/${studentId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function activateStudent(studentId: number): Promise<void> {
  await apiRequestVoid(`/directory/students/${studentId}/activate`, {
    method: "POST",
  });
}

export async function deactivateStudent(studentId: number): Promise<void> {
  await apiRequestVoid(`/directory/students/${studentId}/deactivate`, {
    method: "POST",
  });
}

export async function bulkDeactivateStudents(
  input: BulkDeactivateInput,
): Promise<BulkActionResult> {
  return apiRequest<BulkActionResult>("/directory/students/bulk-deactivate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listTeachers(
  filters: DirectoryTeacherFilters = {},
): Promise<PagedDirectoryResult<DirectoryTeacher>> {
  return apiRequest<PagedDirectoryResult<DirectoryTeacher>>(
    `/directory/teachers${toQuery({
      schoolId: filters.schoolId,
      campusId: filters.campusId,
      search: filters.search,
      pageNumber: filters.pageNumber,
      pageSize: filters.pageSize,
    })}`,
  );
}

export async function createTeacher(
  input: CreateDirectoryTeacherInput,
): Promise<DirectoryTeacher> {
  return apiRequest<DirectoryTeacher>("/directory/teachers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateTeacher(
  teacherId: number,
  input: UpdateDirectoryTeacherInput,
): Promise<DirectoryTeacher> {
  return apiRequest<DirectoryTeacher>(`/directory/teachers/${teacherId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function activateTeacher(teacherId: number): Promise<void> {
  await apiRequestVoid(`/directory/teachers/${teacherId}/activate`, {
    method: "POST",
  });
}

export async function deactivateTeacher(teacherId: number): Promise<void> {
  await apiRequestVoid(`/directory/teachers/${teacherId}/deactivate`, {
    method: "POST",
  });
}

export async function bulkDeactivateTeachers(
  input: BulkDeactivateInput,
): Promise<BulkActionResult> {
  return apiRequest<BulkActionResult>("/directory/teachers/bulk-deactivate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listParents(
  filters: DirectoryParentFilters = {},
): Promise<PagedDirectoryResult<DirectoryParent>> {
  return apiRequest<PagedDirectoryResult<DirectoryParent>>(
    `/directory/parents${toQuery({
      search: filters.search,
      pageNumber: filters.pageNumber,
      pageSize: filters.pageSize,
    })}`,
  );
}

export async function createParent(
  input: CreateDirectoryParentInput,
): Promise<DirectoryParent> {
  return apiRequest<DirectoryParent>("/directory/parents", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateParent(
  parentId: number,
  input: UpdateDirectoryParentInput,
): Promise<DirectoryParent> {
  return apiRequest<DirectoryParent>(`/directory/parents/${parentId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function activateParent(parentId: number): Promise<void> {
  await apiRequestVoid(`/directory/parents/${parentId}/activate`, {
    method: "POST",
  });
}

export async function deactivateParent(parentId: number): Promise<void> {
  await apiRequestVoid(`/directory/parents/${parentId}/deactivate`, {
    method: "POST",
  });
}

export async function bulkDeactivateParents(
  input: BulkDeactivateInput,
): Promise<BulkActionResult> {
  return apiRequest<BulkActionResult>("/directory/parents/bulk-deactivate", {
    method: "POST",
    body: JSON.stringify(input),
  });
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

export async function listSchoolAdmins(
  filters: DirectorySchoolAdminFilters = {},
): Promise<PagedDirectoryResult<DirectorySchoolAdmin>> {
  return apiRequest<PagedDirectoryResult<DirectorySchoolAdmin>>(
    `/directory/school-admins${toQuery({
      schoolId: filters.schoolId,
      search: filters.search,
      pageNumber: filters.pageNumber,
      pageSize: filters.pageSize,
    })}`,
  );
}

export async function createSchoolAdmin(
  input: CreateDirectorySchoolAdminInput,
): Promise<DirectorySchoolAdmin> {
  return apiRequest<DirectorySchoolAdmin>("/directory/school-admins", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateSchoolAdmin(
  userId: number,
  input: UpdateDirectorySchoolAdminInput,
): Promise<DirectorySchoolAdmin> {
  return apiRequest<DirectorySchoolAdmin>(
    `/directory/school-admins/${userId}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}

export async function activateSchoolAdmin(userId: number): Promise<void> {
  await apiRequestVoid(`/directory/school-admins/${userId}/activate`, {
    method: "POST",
  });
}

export async function deactivateSchoolAdmin(userId: number): Promise<void> {
  await apiRequestVoid(`/directory/school-admins/${userId}/deactivate`, {
    method: "POST",
  });
}

export async function listCampusAdmins(
  filters: DirectoryCampusAdminFilters = {},
): Promise<PagedDirectoryResult<DirectoryCampusAdmin>> {
  return apiRequest<PagedDirectoryResult<DirectoryCampusAdmin>>(
    `/directory/campus-admins${toQuery({
      schoolId: filters.schoolId,
      campusId: filters.campusId,
      search: filters.search,
      pageNumber: filters.pageNumber,
      pageSize: filters.pageSize,
    })}`,
  );
}

export async function createCampusAdmin(
  input: CreateDirectoryCampusAdminInput,
): Promise<DirectoryCampusAdmin> {
  return apiRequest<DirectoryCampusAdmin>("/directory/campus-admins", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCampusAdmin(
  userId: number,
  input: UpdateDirectoryCampusAdminInput,
): Promise<DirectoryCampusAdmin> {
  return apiRequest<DirectoryCampusAdmin>(
    `/directory/campus-admins/${userId}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}

export async function activateCampusAdmin(userId: number): Promise<void> {
  await apiRequestVoid(`/directory/campus-admins/${userId}/activate`, {
    method: "POST",
  });
}

export async function deactivateCampusAdmin(userId: number): Promise<void> {
  await apiRequestVoid(`/directory/campus-admins/${userId}/deactivate`, {
    method: "POST",
  });
}
