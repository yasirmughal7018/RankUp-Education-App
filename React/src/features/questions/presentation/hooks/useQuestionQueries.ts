/**
 * React Query hooks for the question bank.
 * Mutations invalidate the shared `questions` list and optional detail key.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/core/api/queryKeys";
import * as questionApi from "@/features/questions/data/questionApi";
import type { QuestionFormValues } from "@/features/questions/domain/questionTypes";

/** UI filter shape for the list query (empty string = no filter). */
export interface QuestionListFilters {
  pendingOnly: boolean;
  activeFilter: "" | "true" | "false";
  subjectId: number | "";
  classId: number | "";
  eligibleForQuizOnly?: boolean;
}

/** Map UI filters to API list params (omit unset fields). */
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

/** Paginated/scoped question list; stale for 30s. */
export function useQuestionsQuery(
  filters: QuestionListFilters,
  options?: { enabled?: boolean },
) {
  const normalized = buildQuestionFilters(filters);

  return useQuery({
    queryKey: queryKeys.questions(normalized),
    queryFn: () =>
      questionApi.listQuestions({
        pendingApprovalOnly: filters.pendingOnly,
        isActive: normalized.isActive,
        subjectId: normalized.subjectId,
        classId: normalized.classId,
        eligibleForQuizOnly: normalized.eligibleForQuizOnly,
      }),
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
}

/** Single question detail by id. */
export function useQuestionQuery(questionId: number) {
  return useQuery({
    queryKey: queryKeys.question(questionId),
    queryFn: () => questionApi.getQuestion(questionId),
    enabled: questionId > 0,
  });
}

/** Invalidate list (and optional detail) after workflow mutations. */
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

/** Approve PendingReview → sets visibility by approver role (Campus/School/Public). */
export function useApproveQuestionMutation(questionId: number) {
  const invalidate = useInvalidateQuestions(questionId);

  return useMutation({
    mutationFn: () => questionApi.approveQuestion(questionId),
    onSuccess: invalidate,
  });
}

/** Reject with required reason text. */
export function useRejectQuestionMutation(questionId: number) {
  const invalidate = useInvalidateQuestions(questionId);

  return useMutation({
    mutationFn: (reason: string) =>
      questionApi.rejectQuestion(questionId, reason),
    onSuccess: invalidate,
  });
}

/** Re-submit Rejected → PendingReview. */
export function useSubmitQuestionMutation(questionId: number) {
  const invalidate = useInvalidateQuestions(questionId);

  return useMutation({
    mutationFn: () => questionApi.submitQuestionForReview(questionId),
    onSuccess: invalidate,
  });
}

/** PortalAdmin-only archive. */
export function useArchiveQuestionMutation(questionId: number) {
  const invalidate = useInvalidateQuestions(questionId);

  return useMutation({
    mutationFn: () => questionApi.archiveQuestion(questionId),
    onSuccess: invalidate,
  });
}

/** Excel import (dry-run or commit); always creates PendingReview on commit. */
export function useImportQuestionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, dryRun }: { file: File; dryRun?: boolean }) =>
      questionApi.importQuestionsFromExcel(file, dryRun ?? false),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
  });
}

/** PortalAdmin-only activate (IsActive=true). */
export function useActivateQuestionMutation(questionId: number) {
  const invalidate = useInvalidateQuestions(questionId);

  return useMutation({
    mutationFn: () => questionApi.activateQuestion(questionId),
    onSuccess: invalidate,
  });
}

/** PortalAdmin-only deactivate (IsActive=false). */
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
