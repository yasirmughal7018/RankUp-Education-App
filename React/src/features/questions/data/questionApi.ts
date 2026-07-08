import { apiRequest, apiRequestVoid } from "@/core/api/apiClient";
import type {
  QuestionDetail,
  QuestionFormValues,
  QuestionListFilters,
  QuestionSummary,
} from "@/features/questions/domain/questionTypes";
import { buildQuestionPayload } from "@/features/questions/domain/questionTypes";

function buildListQuery(filters: QuestionListFilters = {}): string {
  const params = new URLSearchParams();

  if (filters.isActive !== undefined) {
    params.set("isActive", String(filters.isActive));
  }

  if (filters.subjectId !== undefined) {
    params.set("subjectId", String(filters.subjectId));
  }

  if (filters.classId !== undefined) {
    params.set("classId", String(filters.classId));
  }

  if (filters.pendingApprovalOnly) {
    params.set("pendingApprovalOnly", "true");
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function listQuestions(
  filters: QuestionListFilters = {},
): Promise<QuestionSummary[]> {
  const response = await apiRequest<{ items: QuestionSummary[] }>(
    `/questions${buildListQuery(filters)}`,
  );

  return response.items;
}

export async function listPendingApprovalQuestions(): Promise<QuestionSummary[]> {
  const response = await apiRequest<{ items: QuestionSummary[] }>(
    "/questions/pending-approval",
  );

  return response.items;
}

export async function getQuestion(questionId: number): Promise<QuestionDetail> {
  return apiRequest<QuestionDetail>(`/questions/${questionId}`);
}

export async function createQuestion(
  values: QuestionFormValues,
): Promise<QuestionDetail> {
  return apiRequest<QuestionDetail>("/questions", {
    method: "POST",
    body: buildQuestionPayload(values),
  });
}

export async function updateQuestion(
  questionId: number,
  values: QuestionFormValues,
): Promise<QuestionDetail> {
  return apiRequest<QuestionDetail>(`/questions/${questionId}`, {
    method: "PUT",
    body: buildQuestionPayload(values),
  });
}

export async function approveQuestion(questionId: number): Promise<void> {
  await apiRequest(`/questions/${questionId}/approve`, { method: "POST" });
}

export async function approveQuestionAi(questionId: number): Promise<void> {
  await apiRequest(`/questions/${questionId}/approve-ai`, { method: "POST" });
}

export async function rejectQuestion(
  questionId: number,
  reason?: string,
): Promise<void> {
  await apiRequest(`/questions/${questionId}/reject`, {
    method: "POST",
    body: { reason: reason ?? null },
  });
}

export async function activateQuestion(questionId: number): Promise<void> {
  await apiRequest(`/questions/${questionId}/activate`, { method: "POST" });
}

export async function deactivateQuestion(questionId: number): Promise<void> {
  await apiRequest(`/questions/${questionId}/deactivate`, { method: "POST" });
}

export async function deleteQuestion(questionId: number): Promise<void> {
  await apiRequestVoid(`/questions/${questionId}`, { method: "DELETE" });
}
