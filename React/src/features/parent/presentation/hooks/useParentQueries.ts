import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/core/api/queryKeys";
import * as parentApi from "@/features/parent/data/parentApi";
import type { LinkMyChildInput } from "@/features/parent/domain/parentTypes";
import * as studentQuizApi from "@/features/student/data/studentQuizApi";

export function useLinkedStudentsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.linkedStudents(),
    queryFn: () => parentApi.listLinkedStudents(),
    enabled,
  });
}

/** Parent self-link child by CNIC or username. */
export function useLinkMyChildMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LinkMyChildInput) => parentApi.linkMyChild(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.linkedStudents() });
    },
  });
}

export function useChildQuizHistoryQuery(studentId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.studentQuizHistory(studentId),
    queryFn: () => parentApi.getChildQuizHistory(studentId),
    enabled: enabled && studentId > 0,
  });
}

export function useParentGroupsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.parentGroups(),
    queryFn: () => parentApi.listMyGroups(),
    enabled,
  });
}

function invalidateParentChildrenData(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.linkedStudents() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.parentGroups() });
}

export function useCreateParentGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: parentApi.createGroup,
    onSuccess: () => invalidateParentChildrenData(queryClient),
  });
}

export function useUpdateParentGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      ...input
    }: {
      groupId: number;
      groupName: string;
      description?: string;
    }) => parentApi.updateGroup(groupId, input),
    onSuccess: () => invalidateParentChildrenData(queryClient),
  });
}

export function useDeleteParentGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: parentApi.deleteGroup,
    onSuccess: () => invalidateParentChildrenData(queryClient),
  });
}

export function useAddParentGroupMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      studentId,
    }: {
      groupId: number;
      studentId: number;
    }) => parentApi.addGroupMember(groupId, studentId),
    onSuccess: () => invalidateParentChildrenData(queryClient),
  });
}

export function useRemoveParentGroupMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      studentId,
    }: {
      groupId: number;
      studentId: number;
    }) => parentApi.removeGroupMember(groupId, studentId),
    onSuccess: () => invalidateParentChildrenData(queryClient),
  });
}

export function useParentChildResultQuery(
  quizId: number,
  attemptId: number,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.studentQuizResult(quizId, attemptId),
    queryFn: () => studentQuizApi.getQuizAttemptResult(quizId, attemptId),
    enabled: enabled && quizId > 0 && attemptId > 0,
  });
}
