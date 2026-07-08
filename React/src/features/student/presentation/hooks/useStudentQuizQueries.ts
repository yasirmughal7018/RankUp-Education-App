import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/core/api/queryKeys";
import * as quizApi from "@/features/quizzes/data/quizApi";
import * as studentQuizApi from "@/features/student/data/studentQuizApi";
import type { SubmitQuizAnswer } from "@/features/student/domain/studentQuizTypes";

export function useStudentQuizzesQuery() {
  return useQuery({
    queryKey: queryKeys.quizzes("student"),
    queryFn: () => quizApi.listQuizzes(),
  });
}

export function useStudentQuizDetailQuery(quizId: number) {
  return useQuery({
    queryKey: queryKeys.studentQuizDetail(quizId),
    queryFn: () => studentQuizApi.getQuizDetail(quizId),
    enabled: quizId > 0,
  });
}

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

export function useStudentQuizResultQuery(quizId: number, attemptId: number) {
  return useQuery({
    queryKey: queryKeys.studentQuizResult(quizId, attemptId),
    queryFn: () => studentQuizApi.getQuizAttemptResult(quizId, attemptId),
    enabled: quizId > 0 && attemptId > 0,
  });
}
