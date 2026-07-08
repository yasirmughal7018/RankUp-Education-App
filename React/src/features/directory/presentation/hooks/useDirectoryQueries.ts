import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/core/api/queryKeys";
import * as directoryApi from "@/features/directory/data/directoryApi";
import type {
  DirectoryStudentFilters,
  DirectoryTeacherFilters,
  LinkParentStudentInput,
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
