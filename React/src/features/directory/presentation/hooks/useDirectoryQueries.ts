import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/core/api/queryKeys";
import * as directoryApi from "@/features/directory/data/directoryApi";
import type {
  DirectoryStudentFilters,
  DirectoryTeacherFilters,
  LinkParentStudentInput,
  UpsertCampusInput,
  UpsertSchoolInput,
} from "@/features/directory/domain/directoryTypes";

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

export function useDirectoryParentsQuery(search?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.directoryParents(search),
    queryFn: () => directoryApi.listParents(search),
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
      schoolId,
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
    mutationFn: ({
      campusId,
      schoolId,
    }: {
      campusId: number;
      schoolId: number;
    }) => directoryApi.activateCampus(campusId),
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
    mutationFn: ({
      campusId,
      schoolId,
    }: {
      campusId: number;
      schoolId: number;
    }) => directoryApi.deactivateCampus(campusId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.directoryCampuses(variables.schoolId),
      });
    },
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["directory", "parents"] });
    },
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["directory", "parents"] });
    },
  });
}
