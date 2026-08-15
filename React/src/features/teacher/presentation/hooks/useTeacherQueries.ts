import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/core/api/queryKeys";
import * as teacherApi from "@/features/teacher/data/teacherApi";

export function useTeacherRosterQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.teacherRoster(),
    queryFn: () => teacherApi.getMyRoster(),
    enabled,
  });
}

export function useTeacherGroupsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.teacherGroups(),
    queryFn: () => teacherApi.listMyGroups(),
    enabled,
  });
}

function invalidateTeacherStudentData(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.teacherRoster() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.teacherGroups() });
}

export function useAddMyStudentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: teacherApi.addMyStudent,
    onSuccess: () => invalidateTeacherStudentData(queryClient),
  });
}

export function useCreateTeacherGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: teacherApi.createGroup,
    onSuccess: () => invalidateTeacherStudentData(queryClient),
  });
}

export function useUpdateTeacherGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      ...input
    }: {
      groupId: number;
      groupName: string;
      description?: string;
    }) => teacherApi.updateGroup(groupId, input),
    onSuccess: () => invalidateTeacherStudentData(queryClient),
  });
}

export function useDeleteTeacherGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: teacherApi.deleteGroup,
    onSuccess: () => invalidateTeacherStudentData(queryClient),
  });
}

export function useAddTeacherGroupMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      studentId,
    }: {
      groupId: number;
      studentId: number;
    }) => teacherApi.addGroupMember(groupId, studentId),
    onSuccess: () => invalidateTeacherStudentData(queryClient),
  });
}

export function useRemoveTeacherGroupMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      studentId,
    }: {
      groupId: number;
      studentId: number;
    }) => teacherApi.removeGroupMember(groupId, studentId),
    onSuccess: () => invalidateTeacherStudentData(queryClient),
  });
}
