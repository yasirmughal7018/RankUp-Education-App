/** React Query hooks for student quiz taking flow. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/core/api/queryKeys";
import * as quizApi from "@/features/quizzes/data/quizApi";
import * as studentQuizApi from "@/features/student/data/studentQuizApi";
import type {
  SaveQuizDraftInput,
  SubmitQuizAnswer,
} from "@/features/student/domain/studentQuizTypes";

/** Assigned quizzes for the signed-in student. */
export function useStudentQuizzesQuery() {
  return useQuery({
    queryKey: queryKeys.quizzes("student"),
    queryFn: () => quizApi.listQuizzes(),
  });
}

/** Quiz instructions and attempt status. */
export function useStudentQuizDetailQuery(quizId: number) {
  return useQuery({
    queryKey: queryKeys.studentQuizDetail(quizId),
    queryFn: () => studentQuizApi.getQuizDetail(quizId),
    enabled: quizId > 0,
  });
}

/** Start or resume an attempt. */
export function useStartQuizAttemptMutation(quizId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => studentQuizApi.startQuizAttempt(quizId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.studentQuizDetail(quizId),
      });
    },
  });
}

/** Autosave in-progress answers. */
export function useSaveQuizDraftMutation(quizId: number, attemptId: number) {
  return useMutation({
    mutationFn: (input: SaveQuizDraftInput) =>
      studentQuizApi.saveQuizAttemptDraft(quizId, attemptId, input),
  });
}

/** Submit attempt for grading. */
export function useSubmitQuizAttemptMutation(quizId: number, attemptId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      answers,
      timeSpentSeconds,
    }: {
      answers: SubmitQuizAnswer[];
      timeSpentSeconds: number;
    }) =>
      studentQuizApi.submitQuizAttempt(
        quizId,
        attemptId,
        answers,
        timeSpentSeconds,
      ),
    onSuccess: (result) => {
      queryClient.setQueryData(
        queryKeys.studentQuizResult(quizId, attemptId),
        result,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.quizzes("student"),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.studentQuizDetail(quizId),
      });
    },
  });
}

/** Graded attempt result. */
export function useStudentQuizResultQuery(quizId: number, attemptId: number) {
  return useQuery({
    queryKey: queryKeys.studentQuizResult(quizId, attemptId),
    queryFn: () => studentQuizApi.getQuizAttemptResult(quizId, attemptId),
    enabled: quizId > 0 && attemptId > 0,
  });
}
