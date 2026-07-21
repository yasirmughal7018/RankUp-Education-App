/** React Query hooks for directory CRUD and summaries. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/core/api/queryKeys";
import * as directoryApi from "@/features/directory/data/directoryApi";
import type {
  CreateDirectoryCampusAdminInput,
  CreateDirectoryParentInput,
  CreateDirectorySchoolAdminInput,
  CreateDirectoryStudentInput,
  CreateDirectoryTeacherInput,
  DirectoryCampusAdminFilters,
  DirectoryParentFilters,
  DirectorySchoolAdminFilters,
  DirectoryStudentFilters,
  DirectoryTeacherFilters,
  LinkParentStudentInput,
  UpdateDirectoryCampusAdminInput,
  UpdateDirectoryParentInput,
  UpdateDirectorySchoolAdminInput,
  UpdateDirectoryStudentInput,
  UpdateDirectoryTeacherInput,
  UpsertCampusInput,
  UpsertSchoolInput,
} from "@/features/directory/domain/directoryTypes";

function invalidateStudents(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["directory", "students"] });
}

function invalidateTeachers(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["directory", "teachers"] });
}

function invalidateParents(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["directory", "parents"] });
}

function invalidateSchoolAdmins(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({
    queryKey: ["directory", "school-admins"],
  });
}

function invalidateCampusAdmins(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({
    queryKey: ["directory", "campus-admins"],
  });
}

/** Directory overview hero counts. */
export function useDirectorySummaryQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.directorySummary(),
    queryFn: () => directoryApi.getDirectorySummary(),
    enabled,
  });
}

/** School list for filters and forms. */
export function useDirectorySchoolsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.directorySchools(),
    queryFn: () => directoryApi.listSchools(),
    enabled,
  });
}

/** Campuses for a selected school. */
export function useDirectoryCampusesQuery(schoolId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.directoryCampuses(schoolId),
    queryFn: () => directoryApi.listCampuses(schoolId),
    enabled: enabled && schoolId > 0,
  });
}

/** Paginated students with filters. */
export function useDirectoryStudentsQuery(
  filters: DirectoryStudentFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.directoryStudents(filters),
    queryFn: () => directoryApi.listStudents(filters),
    enabled,
  });
}

/** Paginated teachers with filters. */
export function useDirectoryTeachersQuery(
  filters: DirectoryTeacherFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.directoryTeachers(filters),
    queryFn: () => directoryApi.listTeachers(filters),
    enabled,
  });
}

/** Paginated parents with filters. */
export function useDirectoryParentsQuery(
  filters: DirectoryParentFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.directoryParents(filters),
    queryFn: () => directoryApi.listParents(filters),
    enabled,
  });
}

/** Create school. */
export function useCreateSchoolMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertSchoolInput) => directoryApi.createSchool(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["directory", "schools"] });
    },
  });
}

/** Update school. */
export function useUpdateSchoolMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      schoolId,
      input,
    }: {
      schoolId: number;
      input: UpsertSchoolInput;
    }) => directoryApi.updateSchool(schoolId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["directory", "schools"] });
    },
  });
}

/** Activate school. */
export function useActivateSchoolMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (schoolId: number) => directoryApi.activateSchool(schoolId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["directory", "schools"] });
    },
  });
}

/** Deactivate school. */
export function useDeactivateSchoolMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (schoolId: number) => directoryApi.deactivateSchool(schoolId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["directory", "schools"] });
    },
  });
}

/** Create campus. */
export function useCreateCampusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      schoolId,
      input,
    }: {
      schoolId: number;
      input: UpsertCampusInput;
    }) => directoryApi.createCampus(schoolId, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.directoryCampuses(variables.schoolId),
      });
    },
  });
}

/** Update campus. */
export function useUpdateCampusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      campusId,
      input,
    }: {
      campusId: number;
      schoolId: number;
      input: UpsertCampusInput;
    }) => directoryApi.updateCampus(campusId, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.directoryCampuses(variables.schoolId),
      });
    },
  });
}

/** Activate campus. */
export function useActivateCampusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campusId }: { campusId: number; schoolId: number }) =>
      directoryApi.activateCampus(campusId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.directoryCampuses(variables.schoolId),
      });
    },
  });
}

/** Deactivate campus. */
export function useDeactivateCampusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campusId }: { campusId: number; schoolId: number }) =>
      directoryApi.deactivateCampus(campusId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.directoryCampuses(variables.schoolId),
      });
    },
  });
}

/** Create student. */
export function useCreateStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDirectoryStudentInput) =>
      directoryApi.createStudent(input),
    onSuccess: () => invalidateStudents(queryClient),
  });
}

/** Update student. */
export function useUpdateStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      studentId,
      input,
    }: {
      studentId: number;
      input: UpdateDirectoryStudentInput;
    }) => directoryApi.updateStudent(studentId, input),
    onSuccess: () => invalidateStudents(queryClient),
  });
}

/** Activate student. */
export function useActivateStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studentId: number) => directoryApi.activateStudent(studentId),
    onSuccess: () => invalidateStudents(queryClient),
  });
}

/** Deactivate student. */
export function useDeactivateStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studentId: number) =>
      directoryApi.deactivateStudent(studentId),
    onSuccess: () => invalidateStudents(queryClient),
  });
}

/** Bulk deactivate students. */
export function useBulkDeactivateStudentsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) =>
      directoryApi.bulkDeactivateStudents({ ids }),
    onSuccess: () => invalidateStudents(queryClient),
  });
}

/** Create teacher. */
export function useCreateTeacherMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDirectoryTeacherInput) =>
      directoryApi.createTeacher(input),
    onSuccess: () => invalidateTeachers(queryClient),
  });
}

/** Update teacher. */
export function useUpdateTeacherMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      teacherId,
      input,
    }: {
      teacherId: number;
      input: UpdateDirectoryTeacherInput;
    }) => directoryApi.updateTeacher(teacherId, input),
    onSuccess: () => invalidateTeachers(queryClient),
  });
}

/** Activate teacher. */
export function useActivateTeacherMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teacherId: number) => directoryApi.activateTeacher(teacherId),
    onSuccess: () => invalidateTeachers(queryClient),
  });
}

/** Deactivate teacher. */
export function useDeactivateTeacherMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teacherId: number) =>
      directoryApi.deactivateTeacher(teacherId),
    onSuccess: () => invalidateTeachers(queryClient),
  });
}

/** Bulk deactivate teachers. */
export function useBulkDeactivateTeachersMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) =>
      directoryApi.bulkDeactivateTeachers({ ids }),
    onSuccess: () => invalidateTeachers(queryClient),
  });
}

/** Create parent. */
export function useCreateParentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDirectoryParentInput) =>
      directoryApi.createParent(input),
    onSuccess: () => invalidateParents(queryClient),
  });
}

/** Update parent. */
export function useUpdateParentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      parentId,
      input,
    }: {
      parentId: number;
      input: UpdateDirectoryParentInput;
    }) => directoryApi.updateParent(parentId, input),
    onSuccess: () => invalidateParents(queryClient),
  });
}

/** Activate parent. */
export function useActivateParentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (parentId: number) => directoryApi.activateParent(parentId),
    onSuccess: () => invalidateParents(queryClient),
  });
}

/** Deactivate parent. */
export function useDeactivateParentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (parentId: number) => directoryApi.deactivateParent(parentId),
    onSuccess: () => invalidateParents(queryClient),
  });
}

/** Bulk deactivate parents. */
export function useBulkDeactivateParentsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => directoryApi.bulkDeactivateParents({ ids }),
    onSuccess: () => invalidateParents(queryClient),
  });
}

/** Link parent student. */
export function useLinkParentStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      parentId,
      input,
    }: {
      parentId: number;
      input: LinkParentStudentInput;
    }) => directoryApi.linkParentStudent(parentId, input),
    onSuccess: () => invalidateParents(queryClient),
  });
}

/** Unlink parent student. */
export function useUnlinkParentStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      parentId,
      studentId,
    }: {
      parentId: number;
      studentId: number;
    }) => directoryApi.unlinkParentStudent(parentId, studentId),
    onSuccess: () => invalidateParents(queryClient),
  });
}

/** Paginated school admins. */
export function useDirectorySchoolAdminsQuery(
  filters: DirectorySchoolAdminFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.directorySchoolAdmins(filters),
    queryFn: () => directoryApi.listSchoolAdmins(filters),
    enabled,
  });
}

/** Create school admin. */
export function useCreateSchoolAdminMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDirectorySchoolAdminInput) =>
      directoryApi.createSchoolAdmin(input),
    onSuccess: () => invalidateSchoolAdmins(queryClient),
  });
}

/** Update school admin. */
export function useUpdateSchoolAdminMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      input,
    }: {
      userId: number;
      input: UpdateDirectorySchoolAdminInput;
    }) => directoryApi.updateSchoolAdmin(userId, input),
    onSuccess: () => invalidateSchoolAdmins(queryClient),
  });
}

/** Activate school admin. */
export function useActivateSchoolAdminMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => directoryApi.activateSchoolAdmin(userId),
    onSuccess: () => invalidateSchoolAdmins(queryClient),
  });
}

/** Deactivate school admin. */
export function useDeactivateSchoolAdminMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => directoryApi.deactivateSchoolAdmin(userId),
    onSuccess: () => invalidateSchoolAdmins(queryClient),
  });
}

/** Paginated campus admins. */
export function useDirectoryCampusAdminsQuery(
  filters: DirectoryCampusAdminFilters = {},
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.directoryCampusAdmins(filters),
    queryFn: () => directoryApi.listCampusAdmins(filters),
    enabled,
  });
}

/** Create campus admin. */
export function useCreateCampusAdminMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDirectoryCampusAdminInput) =>
      directoryApi.createCampusAdmin(input),
    onSuccess: () => invalidateCampusAdmins(queryClient),
  });
}

/** Update campus admin. */
export function useUpdateCampusAdminMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      input,
    }: {
      userId: number;
      input: UpdateDirectoryCampusAdminInput;
    }) => directoryApi.updateCampusAdmin(userId, input),
    onSuccess: () => invalidateCampusAdmins(queryClient),
  });
}

/** Activate campus admin. */
export function useActivateCampusAdminMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => directoryApi.activateCampusAdmin(userId),
    onSuccess: () => invalidateCampusAdmins(queryClient),
  });
}

/** Deactivate campus admin. */
export function useDeactivateCampusAdminMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => directoryApi.deactivateCampusAdmin(userId),
    onSuccess: () => invalidateCampusAdmins(queryClient),
  });
}
