import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/core/api/queryKeys";
import * as parentApi from "@/features/parent/data/parentApi";
import * as studentQuizApi from "@/features/student/data/studentQuizApi";

export function useLinkedStudentsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.linkedStudents(),
    queryFn: () => parentApi.listLinkedStudents(),
    enabled,
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
