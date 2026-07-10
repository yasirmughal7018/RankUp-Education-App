import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/core/api/queryKeys";
import * as questionApi from "@/features/questions/data/questionApi";
import type { QuestionFormValues } from "@/features/questions/domain/questionTypes";

export interface QuestionListFilters {
  pendingOnly: boolean;
  activeFilter: "" | "true" | "false";
  subjectId: number | "";
  classId: number | "";
  eligibleForQuizOnly?: boolean;
}

function buildQuestionFilters(filters: QuestionListFilters) {
  return {
    pendingOnly: filters.pendingOnly,
    isActive:
      filters.activeFilter === ""
        ? undefined
        : filters.activeFilter === "true",
    subjectId: filters.subjectId === "" ? undefined : filters.subjectId,
    classId: filters.classId === "" ? undefined : filters.classId,
    eligibleForQuizOnly: filters.eligibleForQuizOnly === true,
  };
}

export function useQuestionsQuery(filters: QuestionListFilters) {
  const normalized = buildQuestionFilters(filters);

  return useQuery({
    queryKey: queryKeys.questions(normalized),
    queryFn: () =>
      filters.pendingOnly
        ? questionApi.listPendingApprovalQuestions()
        : questionApi.listQuestions({
            pendingApprovalOnly: false,
            isActive: normalized.isActive,
            subjectId: normalized.subjectId,
            classId: normalized.classId,
            eligibleForQuizOnly: normalized.eligibleForQuizOnly,
          }),
  });
}

export function useQuestionQuery(questionId: number) {
  return useQuery({
    queryKey: queryKeys.question(questionId),
    queryFn: () => questionApi.getQuestion(questionId),
    enabled: questionId > 0,
  });
}

function useInvalidateQuestions(questionId?: number) {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ["questions"] });
    if (questionId) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.question(questionId),
      });
    }
  };
}

export function useDeleteQuestionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (questionId: number) => questionApi.deleteQuestion(questionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
  });
}

export function useApproveQuestionMutation(questionId: number) {
  const invalidate = useInvalidateQuestions(questionId);

  return useMutation({
    mutationFn: () => questionApi.approveQuestion(questionId),
    onSuccess: invalidate,
  });
}

export function useApproveQuestionAiMutation(questionId: number) {
  const invalidate = useInvalidateQuestions(questionId);

  return useMutation({
    mutationFn: () => questionApi.approveQuestionAi(questionId),
    onSuccess: invalidate,
  });
}

export function useRejectQuestionMutation(questionId: number) {
  const invalidate = useInvalidateQuestions(questionId);

  return useMutation({
    mutationFn: (reason?: string) =>
      questionApi.rejectQuestion(questionId, reason),
    onSuccess: invalidate,
  });
}

export function useActivateQuestionMutation(questionId: number) {
  const invalidate = useInvalidateQuestions(questionId);

  return useMutation({
    mutationFn: () => questionApi.activateQuestion(questionId),
    onSuccess: invalidate,
  });
}

export function useDeactivateQuestionMutation(questionId: number) {
  const invalidate = useInvalidateQuestions(questionId);

  return useMutation({
    mutationFn: () => questionApi.deactivateQuestion(questionId),
    onSuccess: invalidate,
  });
}

export function useUpdateQuestionMutation(questionId: number) {
  const invalidate = useInvalidateQuestions(questionId);

  return useMutation({
    mutationFn: (values: QuestionFormValues) =>
      questionApi.updateQuestion(questionId, values),
    onSuccess: invalidate,
  });
}
