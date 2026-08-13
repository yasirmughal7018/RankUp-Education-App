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
