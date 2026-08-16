import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/core/api/queryKeys";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import * as teacherApi from "@/features/teacher/data/teacherApi";

export function useTeacherRosterQuery(enabled = true) {
  const { user } = useAuth();
  const activeRole = user?.role ?? null;
  return useQuery({
    queryKey: queryKeys.teacherRoster(activeRole),
    queryFn: () => teacherApi.getMyRoster(),
    enabled: enabled && activeRole != null,
  });
}

export function useTeacherGroupsQuery(enabled = true) {
  const { user } = useAuth();
  const activeRole = user?.role ?? null;
  return useQuery({
    queryKey: queryKeys.teacherGroups(activeRole),
    queryFn: () => teacherApi.listMyGroups(),
    enabled: enabled && activeRole != null,
  });
}

function invalidateTeacherStudentData(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: ["teachers", "me", "roster"] });
  void queryClient.invalidateQueries({ queryKey: ["teachers", "me", "groups"] });
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
