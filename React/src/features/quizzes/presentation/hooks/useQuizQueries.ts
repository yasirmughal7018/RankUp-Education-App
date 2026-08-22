/** React Query hooks for quiz management, assignments, and attempt review. */
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

/** List quizzes with optional search. */
export function useQuizzesQuery(search?: string) {
  return useQuery({
    queryKey: queryKeys.quizzes(search),
    queryFn: () => quizApi.listQuizzes(search),
  });
}

/** Admin queue of quizzes awaiting approval. */
export function usePendingQuizApprovalsQuery() {
  return useQuery({
    queryKey: queryKeys.pendingQuizApprovals(),
    queryFn: () => quizApi.listPendingQuizApprovals(),
  });
}

export function usePendingQuizEditRequestsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.quizEditRequests(),
    queryFn: () => quizApi.listPendingQuizEditRequests(),
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
}

export function useRequestQuizEditMutation(quizId: number) {
  const invalidate = useInvalidateQuizDetail(quizId);

  return useMutation({
    mutationFn: (reason: string) => quizApi.requestQuizEdit(quizId, reason),
    onSuccess: () => {
      invalidate();
      // list key is length 2 so invalidateQuizListQueries already covers it
    },
  });
}

export function useApproveQuizEditRequestMutation(quizId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: number) => quizApi.approveQuizEditRequest(requestId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.quizEditRequests() });
      if (quizId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.manageQuiz(quizId) });
      }
    },
  });
}

export function useRejectQuizEditRequestMutation(quizId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, reason }: { requestId: number; reason: string }) =>
      quizApi.rejectQuizEditRequest(requestId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.quizEditRequests() });
      if (quizId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.manageQuiz(quizId) });
      }
    },
  });
}

/** Single quiz detail for manage/edit pages. */
export function useManageQuizQuery(quizId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.manageQuiz(quizId),
    queryFn: () => quizApi.getManageQuiz(quizId),
    enabled: enabled && quizId > 0,
    // Hard-deleted quizzes must not auto-retry / refetch after cache removal.
    retry: false,
  });
}

/** Assignments for one quiz. */
export function useQuizAssignmentsQuery(quizId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.quizAssignments(quizId),
    queryFn: () => quizApi.listQuizAssignments(quizId),
    enabled: enabled && quizId > 0,
  });
}

/** Cross-quiz assignment board. */
export function useAssignmentBoardQuery(studentId?: number | null) {
  return useQuery({
    queryKey: queryKeys.assignmentBoard(studentId),
    queryFn: () => quizMonitorApi.listAssignmentBoard(studentId),
  });
}

/** Attempts awaiting manual grading. */
export function usePendingReviewsQuery() {
  return useQuery({
    queryKey: queryKeys.pendingReviews(),
    queryFn: () => quizMonitorApi.listPendingReviews(),
  });
}

/** Live monitoring snapshot for a quiz. */
export function useQuizMonitoringQuery(quizId: number) {
  return useQuery({
    queryKey: queryKeys.quizMonitoring(quizId),
    queryFn: () => quizMonitorApi.getQuizMonitoring(quizId),
    enabled: quizId > 0,
  });
}

/** Attempt detail for the review page. */
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
    invalidateQuizListQueries(queryClient);
  };
}

/**
 * Invalidate quiz *list* caches only.
 * Do not use queryKey: ["quizzes"] — that prefix also matches manage/assignments/monitoring
 * and refetches them after delete/archive (causing NotFound on a removed quiz).
 */
function invalidateQuizListQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({
    predicate: (query) =>
      query.queryKey[0] === "quizzes" && query.queryKey.length === 2,
  });
}

/** Publish a draft quiz. */
export function usePublishQuizMutation(quizId: number) {
  const invalidate = useInvalidateQuizDetail(quizId);

  return useMutation({
    mutationFn: () => quizApi.publishQuiz(quizId),
    onSuccess: invalidate,
  });
}

/** Permanently delete a draft quiz. */
export function useDeleteQuizMutation(quizId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => quizApi.deleteQuiz(quizId),
    onMutate: async () => {
      // Cancel in-flight detail fetches; the page must also disable these queries
      // before mutateAsync so removeQueries does not trigger a GetManageDetail refetch.
      await queryClient.cancelQueries({ queryKey: queryKeys.manageQuiz(quizId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.quizAssignments(quizId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.quizMonitoring(quizId) });
    },
    onSuccess: () => {
      // Do not removeQueries here — an active observer would immediately refetch
      // GetManageDetail. The page disables queries then navigates away.
      invalidateQuizListQueries(queryClient);
    },
  });
}

/** Clone quiz as new draft. */
export function useDuplicateQuizMutation(quizId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => quizApi.duplicateQuiz(quizId),
    onSuccess: (quiz) => {
      invalidateQuizListQueries(queryClient);
      if (quiz?.id > 0) {
        queryClient.setQueryData(queryKeys.manageQuiz(quiz.id), quiz);
      }
    },
  });
}

/** Archive a published quiz (hard-deletes when not started / unassigned). */
export function useArchiveQuizMutation(quizId: number) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateQuizDetail(quizId);

  return useMutation({
    mutationFn: () => quizApi.archiveQuiz(quizId),
    onSuccess: (result) => {
      invalidateQuizListQueries(queryClient);
      if (result.permanentlyDeleted) {
        // Hard-delete: page suppresses detail queries and navigates — do not refetch manage.
        void queryClient.cancelQueries({ queryKey: queryKeys.manageQuiz(quizId) });
        void queryClient.cancelQueries({ queryKey: queryKeys.quizAssignments(quizId) });
        return;
      }

      // Soft archive: refresh manage detail + assignments for latest lifecycle.
      invalidate();
    },
  });
}

/** Restore an archived quiz. */
export function useUnarchiveQuizMutation(quizId: number) {
  const invalidate = useInvalidateQuizDetail(quizId);

  return useMutation({
    mutationFn: () => quizApi.unarchiveQuiz(quizId),
    onSuccess: invalidate,
  });
}

/** Remove a question from the quiz. */
export function useRemoveQuizQuestionMutation(quizId: number) {
  const invalidate = useInvalidateQuizDetail(quizId);

  return useMutation({
    mutationFn: (questionId: number) =>
      quizApi.removeQuizQuestion(quizId, questionId),
    onSuccess: invalidate,
  });
}

/** Add inline question to quiz. */
export function useAddQuizQuestionMutation(quizId: number) {
  const invalidate = useInvalidateQuizDetail(quizId);

  return useMutation({
    mutationFn: (input: AddQuizQuestionInput) =>
      quizApi.addQuizQuestion(quizId, input),
    onSuccess: invalidate,
  });
}

/** Update inline quiz question. */
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

/** Attach bank question to quiz. */
export function useAttachBankQuestionMutation(quizId: number) {
  const invalidate = useInvalidateQuizDetail(quizId);

  return useMutation({
    mutationFn: (input: AttachBankQuestionInput) =>
      quizApi.attachBankQuestion(quizId, input),
    onSuccess: invalidate,
  });
}

/** Assign quiz to students/group/grade. */
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

/** Cancel all assignments. */
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

/** Grant extra attempts on assignment. */
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

/** Update quiz metadata. */
export function useUpdateQuizMutation(quizId: number) {
  const invalidate = useInvalidateQuizDetail(quizId);

  return useMutation({
    mutationFn: (values: QuizFormValues) => quizApi.updateQuiz(quizId, values),
    onSuccess: invalidate,
  });
}

/** Admin approve pending quiz. */
export function useApproveQuizMutation(quizId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetQuizId: number) => quizApi.approveQuiz(targetQuizId),
    onSuccess: (_data, targetQuizId) => {
      invalidateQuizListQueries(queryClient);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.pendingQuizApprovals(),
      });
      const id = quizId ?? targetQuizId;
      if (id > 0) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.manageQuiz(id),
        });
      }
    },
  });
}

/** Admin reject pending quiz. */
export function useRejectQuizMutation(quizId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quizId: targetQuizId,
      reason,
    }: {
      quizId: number;
      reason: string;
    }) => quizApi.rejectQuiz(targetQuizId, reason),
    onSuccess: (_data, variables) => {
      invalidateQuizListQueries(queryClient);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.pendingQuizApprovals(),
      });
      const id = quizId ?? variables.quizId;
      if (id > 0) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.manageQuiz(id),
        });
      }
    },
  });
}

/** Save manual grading marks. */
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

/** Finalize review and release results. */
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

/** Manual cache invalidation helpers. */
export function useInvalidateQuizQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateQuizzes: () => invalidateQuizListQueries(queryClient),
    invalidateManageQuiz: (quizId: number) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.manageQuiz(quizId) }),
  };
}
