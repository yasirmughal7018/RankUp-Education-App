/** Directory HTTP client — schools, campuses, people CRUD and bulk actions. */
import { apiRequest, apiRequestVoid } from "@/core/api/apiClient";
import {
  EMPTY_SCHOOL_STATUS_COUNTS,
  EMPTY_STATUS_COUNTS,
  type BulkActionResult,
  type BulkDeactivateInput,
  type CreateDirectoryCampusAdminInput,
  type CreateDirectoryParentInput,
  type CreateDirectorySchoolAdminInput,
  type CreateDirectoryStudentInput,
  type CreateDirectoryTeacherInput,
  type DirectoryCampus,
  type DirectoryCampusAdmin,
  type DirectoryCampusAdminFilters,
  type DirectoryParent,
  type DirectoryParentFilters,
  type DirectorySchool,
  type DirectorySchoolAdmin,
  type DirectorySchoolAdminFilters,
  type DirectoryStudent,
  type DirectoryStudentFilters,
  type DirectorySchoolStatusCounts,
  type DirectoryStatusCounts,
  type DirectorySummary,
  type DirectoryTeacher,
  type DirectoryTeacherFilters,
  type LinkParentStudentInput,
  type LinkParentStudentResult,
  type PagedDirectoryResult,
  type UpdateDirectoryCampusAdminInput,
  type UpdateDirectoryParentInput,
  type UpdateDirectorySchoolAdminInput,
  type UpdateDirectoryStudentInput,
  type UpdateDirectoryTeacherInput,
  type UpsertCampusInput,
  type UpsertSchoolInput,
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

function normalizePeopleCounts(
  value: DirectoryStatusCounts | null | undefined,
): DirectoryStatusCounts {
  if (!value || typeof value !== "object") {
    return { ...EMPTY_STATUS_COUNTS };
  }
  const activeReady = Number(value.activeReady) || 0;
  const pendingApproval = Number(value.pendingApproval) || 0;
  const needsPasswordSetup = Number(value.needsPasswordSetup) || 0;
  const locked = Number(value.locked) || 0;
  const deactivated = Number(value.deactivated) || 0;
  const rejected = Number(value.rejected) || 0;
  // QA: Active/Ready ≠ NeedsPasswordSetup. Hero Active = Ready only.
  const active = activeReady;
  // Total = all mutually exclusive states for this role.
  const total =
    activeReady +
    pendingApproval +
    needsPasswordSetup +
    locked +
    deactivated +
    rejected;
  return {
    active,
    activeReady,
    pendingApproval,
    needsPasswordSetup,
    locked,
    deactivated,
    rejected,
    total,
  };
}

function normalizeSchoolCounts(
  value: DirectorySchoolStatusCounts | null | undefined,
): DirectorySchoolStatusCounts {
  if (!value || typeof value !== "object") {
    return { ...EMPTY_SCHOOL_STATUS_COUNTS };
  }
  const active = Number(value.active) || 0;
  const inactive = Number(value.inactive) || 0;
  return {
    active,
    inactive,
    total: active + inactive,
  };
}

/** Hero counts and visible sections for directory overview. */
export async function getDirectorySummary(): Promise<DirectorySummary> {
  const raw = await apiRequest<DirectorySummary>("/directory/summary");
  return {
    schools: normalizeSchoolCounts(raw.schools),
    students: normalizePeopleCounts(raw.students),
    parents: normalizePeopleCounts(raw.parents),
    teachers: normalizePeopleCounts(raw.teachers),
    schoolAdmins: normalizePeopleCounts(raw.schoolAdmins),
    campusAdmins: normalizePeopleCounts(raw.campusAdmins),
    visibleSections: Array.isArray(raw.visibleSections)
      ? raw.visibleSections
      : [],
  };
}

/** All schools visible to the current admin. */
export async function listSchools(): Promise<DirectorySchool[]> {
  const response = await apiRequest<{ items: DirectorySchool[] }>(
    "/directory/schools",
  );
  return response.items;
}

/** Create a new school. */
export async function createSchool(
  input: UpsertSchoolInput,
): Promise<DirectorySchool> {
  return apiRequest<DirectorySchool>("/directory/schools", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Update school metadata. */
export async function updateSchool(
  schoolId: number,
  input: UpsertSchoolInput,
): Promise<DirectorySchool> {
  return apiRequest<DirectorySchool>(`/directory/schools/${schoolId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/** Reactivate a deactivated school. */
export async function activateSchool(schoolId: number): Promise<void> {
  await apiRequestVoid(`/directory/schools/${schoolId}/activate`, {
    method: "POST",
  });
}

/** Deactivate a school. */
export async function deactivateSchool(schoolId: number): Promise<void> {
  await apiRequestVoid(`/directory/schools/${schoolId}/deactivate`, {
    method: "POST",
  });
}

/** Campuses belonging to a school. */
export async function listCampuses(schoolId: number): Promise<DirectoryCampus[]> {
  const response = await apiRequest<{ items: DirectoryCampus[] }>(
    `/directory/schools/${schoolId}/campuses`,
  );
  return response.items;
}

/** Add campus under a school. */
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

/** Update campus metadata. */
export async function updateCampus(
  campusId: number,
  input: UpsertCampusInput,
): Promise<DirectoryCampus> {
  return apiRequest<DirectoryCampus>(`/directory/campuses/${campusId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/** Reactivate a campus. */
export async function activateCampus(campusId: number): Promise<void> {
  await apiRequestVoid(`/directory/campuses/${campusId}/activate`, {
    method: "POST",
  });
}

/** Deactivate a campus. */
export async function deactivateCampus(campusId: number): Promise<void> {
  await apiRequestVoid(`/directory/campuses/${campusId}/deactivate`, {
    method: "POST",
  });
}

/** Paginated student directory with filters. */
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

/** Create student account and profile. */
export async function createStudent(
  input: CreateDirectoryStudentInput,
): Promise<DirectoryStudent> {
  return apiRequest<DirectoryStudent>("/directory/students", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Update student profile. */
export async function updateStudent(
  studentId: number,
  input: UpdateDirectoryStudentInput,
): Promise<DirectoryStudent> {
  return apiRequest<DirectoryStudent>(`/directory/students/${studentId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/** Reactivate student account. */
export async function activateStudent(studentId: number): Promise<void> {
  await apiRequestVoid(`/directory/students/${studentId}/activate`, {
    method: "POST",
  });
}

/** Deactivate student account. */
export async function deactivateStudent(studentId: number): Promise<void> {
  await apiRequestVoid(`/directory/students/${studentId}/deactivate`, {
    method: "POST",
  });
}

/** Deactivate many students at once. */
export async function bulkDeactivateStudents(
  input: BulkDeactivateInput,
): Promise<BulkActionResult> {
  return apiRequest<BulkActionResult>("/directory/students/bulk-deactivate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Paginated teacher directory with filters. */
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

/** Create teacher account and profile. */
export async function createTeacher(
  input: CreateDirectoryTeacherInput,
): Promise<DirectoryTeacher> {
  return apiRequest<DirectoryTeacher>("/directory/teachers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Update teacher profile. */
export async function updateTeacher(
  teacherId: number,
  input: UpdateDirectoryTeacherInput,
): Promise<DirectoryTeacher> {
  return apiRequest<DirectoryTeacher>(`/directory/teachers/${teacherId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/** Reactivate teacher account. */
export async function activateTeacher(teacherId: number): Promise<void> {
  await apiRequestVoid(`/directory/teachers/${teacherId}/activate`, {
    method: "POST",
  });
}

/** Deactivate teacher account. */
export async function deactivateTeacher(teacherId: number): Promise<void> {
  await apiRequestVoid(`/directory/teachers/${teacherId}/deactivate`, {
    method: "POST",
  });
}

/** Deactivate many teachers at once. */
export async function bulkDeactivateTeachers(
  input: BulkDeactivateInput,
): Promise<BulkActionResult> {
  return apiRequest<BulkActionResult>("/directory/teachers/bulk-deactivate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Paginated parent directory. */
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

/** Create parent account. */
export async function createParent(
  input: CreateDirectoryParentInput,
): Promise<DirectoryParent> {
  return apiRequest<DirectoryParent>("/directory/parents", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Update parent profile. */
export async function updateParent(
  parentId: number,
  input: UpdateDirectoryParentInput,
): Promise<DirectoryParent> {
  return apiRequest<DirectoryParent>(`/directory/parents/${parentId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/** Reactivate parent account. */
export async function activateParent(parentId: number): Promise<void> {
  await apiRequestVoid(`/directory/parents/${parentId}/activate`, {
    method: "POST",
  });
}

/** Deactivate parent account. */
export async function deactivateParent(parentId: number): Promise<void> {
  await apiRequestVoid(`/directory/parents/${parentId}/deactivate`, {
    method: "POST",
  });
}

/** Deactivate many parents at once. */
export async function bulkDeactivateParents(
  input: BulkDeactivateInput,
): Promise<BulkActionResult> {
  return apiRequest<BulkActionResult>("/directory/parents/bulk-deactivate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Link parent to a student. */
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

/** Remove parent-student link. */
export async function unlinkParentStudent(
  parentId: number,
  studentId: number,
): Promise<void> {
  await apiRequestVoid(`/directory/parents/${parentId}/students/${studentId}`, {
    method: "DELETE",
  });
}

/** Paginated school admin directory. */
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

/** Create school admin account. */
export async function createSchoolAdmin(
  input: CreateDirectorySchoolAdminInput,
): Promise<DirectorySchoolAdmin> {
  return apiRequest<DirectorySchoolAdmin>("/directory/school-admins", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Update school admin profile. */
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

/** Reactivate school admin. */
export async function activateSchoolAdmin(userId: number): Promise<void> {
  await apiRequestVoid(`/directory/school-admins/${userId}/activate`, {
    method: "POST",
  });
}

/** Deactivate school admin. */
export async function deactivateSchoolAdmin(userId: number): Promise<void> {
  await apiRequestVoid(`/directory/school-admins/${userId}/deactivate`, {
    method: "POST",
  });
}

/** Paginated campus admin directory. */
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

/** Create campus admin account. */
export async function createCampusAdmin(
  input: CreateDirectoryCampusAdminInput,
): Promise<DirectoryCampusAdmin> {
  return apiRequest<DirectoryCampusAdmin>("/directory/campus-admins", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Update campus admin profile. */
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

/** Reactivate campus admin. */
export async function activateCampusAdmin(userId: number): Promise<void> {
  await apiRequestVoid(`/directory/campus-admins/${userId}/activate`, {
    method: "POST",
  });
}

/** Deactivate campus admin. */
export async function deactivateCampusAdmin(userId: number): Promise<void> {
  await apiRequestVoid(`/directory/campus-admins/${userId}/deactivate`, {
    method: "POST",
  });
}
