import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/core/api/queryKeys";
import * as quizApi from "@/features/quizzes/data/quizApi";
import * as quizMonitorApi from "@/features/quizzes/data/quizMonitorApi";
import type {
  AddQuizQuestionInput,
  AssignQuizInput,
  AttachBankQuestionInput,
  QuizFormValues,
} from "@/features/quizzes/domain/quizTypes";
import type { MarkAttemptAnswerInput } from "@/features/quizzes/domain/quizMonitorTypes";

export function useQuizzesQuery(search?: string) {
  return useQuery({
    queryKey: queryKeys.quizzes(search),
    queryFn: () => quizApi.listQuizzes(search),
  });
}

export function usePendingQuizApprovalsQuery() {
  return useQuery({
    queryKey: queryKeys.pendingQuizApprovals(),
    queryFn: () => quizApi.listPendingQuizApprovals(),
  });
}

export function useManageQuizQuery(quizId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.manageQuiz(quizId),
    queryFn: () => quizApi.getManageQuiz(quizId),
    enabled: enabled && quizId > 0,
  });
}

export function useQuizAssignmentsQuery(quizId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.quizAssignments(quizId),
    queryFn: () => quizApi.listQuizAssignments(quizId),
    enabled: enabled && quizId > 0,
  });
}

export function useAssignmentBoardQuery(studentId?: number | null) {
  return useQuery({
    queryKey: queryKeys.assignmentBoard(studentId),
    queryFn: () => quizMonitorApi.listAssignmentBoard(studentId),
  });
}

export function usePendingReviewsQuery() {
  return useQuery({
    queryKey: queryKeys.pendingReviews(),
    queryFn: () => quizMonitorApi.listPendingReviews(),
  });
}

export function useQuizMonitoringQuery(quizId: number) {
  return useQuery({
    queryKey: queryKeys.quizMonitoring(quizId),
    queryFn: () => quizMonitorApi.getQuizMonitoring(quizId),
    enabled: quizId > 0,
  });
}

export function useAttemptReviewQuery(quizId: number, attemptId: number) {
  return useQuery({
    queryKey: queryKeys.attemptReview(quizId, attemptId),
    queryFn: () => quizMonitorApi.getAttemptReview(quizId, attemptId),
    enabled: quizId > 0 && attemptId > 0,
  });
}

function useInvalidateQuizDetail(quizId: number) {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.manageQuiz(quizId) });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.quizAssignments(quizId),
    });
    void queryClient.invalidateQueries({ queryKey: ["quizzes"] });
  };
}

export function usePublishQuizMutation(quizId: number) {
  const invalidate = useInvalidateQuizDetail(quizId);

  return useMutation({
    mutationFn: () => quizApi.publishQuiz(quizId),
    onSuccess: invalidate,
  });
}

export function useDeleteQuizMutation(quizId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => quizApi.deleteQuiz(quizId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    },
  });
}

export function useDuplicateQuizMutation(quizId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => quizApi.duplicateQuiz(quizId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    },
  });
}

export function useArchiveQuizMutation(quizId: number) {
  const invalidate = useInvalidateQuizDetail(quizId);

  return useMutation({
    mutationFn: () => quizApi.archiveQuiz(quizId),
    onSuccess: invalidate,
  });
}

export function useRemoveQuizQuestionMutation(quizId: number) {
  const invalidate = useInvalidateQuizDetail(quizId);

  return useMutation({
    mutationFn: (questionId: number) =>
      quizApi.removeQuizQuestion(quizId, questionId),
    onSuccess: invalidate,
  });
}

export function useAddQuizQuestionMutation(quizId: number) {
  const invalidate = useInvalidateQuizDetail(quizId);

  return useMutation({
    mutationFn: (input: AddQuizQuestionInput) =>
      quizApi.addQuizQuestion(quizId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateQuizQuestionMutation(quizId: number) {
  const invalidate = useInvalidateQuizDetail(quizId);

  return useMutation({
    mutationFn: ({
      questionId,
      input,
    }: {
      questionId: number;
      input: AddQuizQuestionInput;
    }) => quizApi.updateQuizQuestion(quizId, questionId, input),
    onSuccess: invalidate,
  });
}

export function useAttachBankQuestionMutation(quizId: number) {
  const invalidate = useInvalidateQuizDetail(quizId);

  return useMutation({
    mutationFn: (input: AttachBankQuestionInput) =>
      quizApi.attachBankQuestion(quizId, input),
    onSuccess: invalidate,
  });
}

export function useAssignQuizMutation(quizId: number) {
  const invalidate = useInvalidateQuizDetail(quizId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AssignQuizInput) => quizApi.assignQuiz(quizId, input),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({
        queryKey: queryKeys.assignmentBoard(),
      });
    },
  });
}

export function useCancelQuizAssignmentsMutation(quizId: number) {
  const invalidate = useInvalidateQuizDetail(quizId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => quizApi.cancelQuizAssignments(quizId),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({
        queryKey: queryKeys.assignmentBoard(),
      });
    },
  });
}

export function useAllowRetryMutation(quizId: number) {
  const invalidate = useInvalidateQuizDetail(quizId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assignmentId,
      extraAttempts = 1,
    }: {
      assignmentId: number;
      extraAttempts?: number;
    }) => quizApi.allowRetry(quizId, assignmentId, extraAttempts),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({
        queryKey: queryKeys.quizMonitoring(quizId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.assignmentBoard(),
      });
    },
  });
}

export function useUpdateQuizMutation(quizId: number) {
  const invalidate = useInvalidateQuizDetail(quizId);

  return useMutation({
    mutationFn: (values: QuizFormValues) => quizApi.updateQuiz(quizId, values),
    onSuccess: invalidate,
  });
}

export function useApproveQuizMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quizId: number) => quizApi.approveQuiz(quizId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.pendingQuizApprovals(),
      });
    },
  });
}

export function useRejectQuizMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quizId, reason }: { quizId: number; reason?: string }) =>
      quizApi.rejectQuiz(quizId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.pendingQuizApprovals(),
      });
    },
  });
}

export function useMarkAttemptAnswersMutation(quizId: number, attemptId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (answers: MarkAttemptAnswerInput[]) =>
      quizMonitorApi.markAttemptAnswers(quizId, attemptId, answers),
    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKeys.attemptReview(quizId, attemptId),
        data,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.pendingReviews(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.quizMonitoring(quizId),
      });
    },
  });
}

export function useFinalizeAttemptReviewMutation(quizId: number, attemptId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => quizMonitorApi.finalizeAttemptReview(quizId, attemptId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.attemptReview(quizId, attemptId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.pendingReviews(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.quizMonitoring(quizId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.assignmentBoard(),
      });
    },
  });
}

export function useInvalidateQuizQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateQuizzes: () =>
      queryClient.invalidateQueries({ queryKey: ["quizzes"] }),
    invalidateManageQuiz: (quizId: number) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.manageQuiz(quizId) }),
  };
}
