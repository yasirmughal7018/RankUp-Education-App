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

export function useDirectorySchoolsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.directorySchools(),
    queryFn: () => directoryApi.listSchools(),
    enabled,
  });
}

export function useDirectoryCampusesQuery(schoolId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.directoryCampuses(schoolId),
    queryFn: () => directoryApi.listCampuses(schoolId),
    enabled: enabled && schoolId > 0,
  });
}

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

export function useCreateSchoolMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertSchoolInput) => directoryApi.createSchool(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["directory", "schools"] });
    },
  });
}

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

export function useActivateSchoolMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (schoolId: number) => directoryApi.activateSchool(schoolId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["directory", "schools"] });
    },
  });
}

export function useDeactivateSchoolMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (schoolId: number) => directoryApi.deactivateSchool(schoolId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["directory", "schools"] });
    },
  });
}

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

export function useCreateStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDirectoryStudentInput) =>
      directoryApi.createStudent(input),
    onSuccess: () => invalidateStudents(queryClient),
  });
}

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

export function useActivateStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studentId: number) => directoryApi.activateStudent(studentId),
    onSuccess: () => invalidateStudents(queryClient),
  });
}

export function useDeactivateStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studentId: number) =>
      directoryApi.deactivateStudent(studentId),
    onSuccess: () => invalidateStudents(queryClient),
  });
}

export function useBulkDeactivateStudentsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) =>
      directoryApi.bulkDeactivateStudents({ ids }),
    onSuccess: () => invalidateStudents(queryClient),
  });
}

export function useCreateTeacherMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDirectoryTeacherInput) =>
      directoryApi.createTeacher(input),
    onSuccess: () => invalidateTeachers(queryClient),
  });
}

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

export function useActivateTeacherMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teacherId: number) => directoryApi.activateTeacher(teacherId),
    onSuccess: () => invalidateTeachers(queryClient),
  });
}

export function useDeactivateTeacherMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teacherId: number) =>
      directoryApi.deactivateTeacher(teacherId),
    onSuccess: () => invalidateTeachers(queryClient),
  });
}

export function useBulkDeactivateTeachersMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) =>
      directoryApi.bulkDeactivateTeachers({ ids }),
    onSuccess: () => invalidateTeachers(queryClient),
  });
}

export function useCreateParentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDirectoryParentInput) =>
      directoryApi.createParent(input),
    onSuccess: () => invalidateParents(queryClient),
  });
}

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

export function useActivateParentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (parentId: number) => directoryApi.activateParent(parentId),
    onSuccess: () => invalidateParents(queryClient),
  });
}

export function useDeactivateParentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (parentId: number) => directoryApi.deactivateParent(parentId),
    onSuccess: () => invalidateParents(queryClient),
  });
}

export function useBulkDeactivateParentsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => directoryApi.bulkDeactivateParents({ ids }),
    onSuccess: () => invalidateParents(queryClient),
  });
}

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

export function useCreateSchoolAdminMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDirectorySchoolAdminInput) =>
      directoryApi.createSchoolAdmin(input),
    onSuccess: () => invalidateSchoolAdmins(queryClient),
  });
}

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

export function useActivateSchoolAdminMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => directoryApi.activateSchoolAdmin(userId),
    onSuccess: () => invalidateSchoolAdmins(queryClient),
  });
}

export function useDeactivateSchoolAdminMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => directoryApi.deactivateSchoolAdmin(userId),
    onSuccess: () => invalidateSchoolAdmins(queryClient),
  });
}

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

export function useCreateCampusAdminMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDirectoryCampusAdminInput) =>
      directoryApi.createCampusAdmin(input),
    onSuccess: () => invalidateCampusAdmins(queryClient),
  });
}

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

export function useActivateCampusAdminMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => directoryApi.activateCampusAdmin(userId),
    onSuccess: () => invalidateCampusAdmins(queryClient),
  });
}

export function useDeactivateCampusAdminMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => directoryApi.deactivateCampusAdmin(userId),
    onSuccess: () => invalidateCampusAdmins(queryClient),
  });
}
