import { apiRequest, apiRequestVoid } from "@/core/api/apiClient";
import type {
  AssignQuizInput,
  AddQuizQuestionInput,
  AttachBankQuestionInput,
  ManageQuiz,
  PendingQuizApproval,
  QuizAssignment,
  QuizFormValues,
  QuizSummary,
  UpdateQuizQuestionInput,
} from "@/features/quizzes/domain/quizTypes";
import {
  buildQuizPayload,
  buildQuizQuestionPayload,
} from "@/features/quizzes/domain/quizTypes";

function buildListQuery(search?: string, subject?: string, grade?: string): string {
  const params = new URLSearchParams();

  if (search?.trim()) {
    params.set("search", search.trim());
  }

  if (subject?.trim()) {
    params.set("subject", subject.trim());
  }

  if (grade?.trim()) {
    params.set("grade", grade.trim());
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function listQuizzes(
  search?: string,
  subject?: string,
  grade?: string,
): Promise<QuizSummary[]> {
  const response = await apiRequest<{ items: QuizSummary[] }>(
    `/quizzes${buildListQuery(search, subject, grade)}`,
  );

  return response.items;
}

export async function getManageQuiz(quizId: number): Promise<ManageQuiz> {
  return apiRequest<ManageQuiz>(`/quizzes/${quizId}/manage`);
}

export async function createQuiz(values: QuizFormValues): Promise<ManageQuiz> {
  return apiRequest<ManageQuiz>("/quizzes", {
    method: "POST",
    body: buildQuizPayload(values),
  });
}

export async function updateQuiz(
  quizId: number,
  values: QuizFormValues,
): Promise<ManageQuiz> {
  const payload = buildQuizPayload(values);
  const updatePayload = { ...payload };
  delete (updatePayload as { contextStudentId?: number | null }).contextStudentId;

  return apiRequest<ManageQuiz>(`/quizzes/${quizId}`, {
    method: "PUT",
    body: updatePayload,
  });
}

export async function deleteQuiz(quizId: number): Promise<void> {
  await apiRequestVoid(`/quizzes/${quizId}`, { method: "DELETE" });
}

export async function publishQuiz(quizId: number): Promise<ManageQuiz> {
  return apiRequest<ManageQuiz>(`/quizzes/${quizId}/publish`, {
    method: "POST",
  });
}

export async function duplicateQuiz(quizId: number): Promise<ManageQuiz> {
  const response = await apiRequest<{ quiz: ManageQuiz }>(
    `/quizzes/${quizId}/duplicate`,
    { method: "POST" },
  );

  return response.quiz;
}

export async function archiveQuiz(quizId: number): Promise<void> {
  await apiRequest(`/quizzes/${quizId}/archive`, { method: "POST" });
}

export async function listPendingQuizApprovals(): Promise<PendingQuizApproval[]> {
  const response = await apiRequest<{ items: PendingQuizApproval[] }>(
    "/quizzes/pending-approval",
  );

  return response.items;
}

export async function approveQuiz(quizId: number): Promise<void> {
  await apiRequest(`/quizzes/${quizId}/approve`, { method: "POST" });
}

export async function rejectQuiz(
  quizId: number,
  reason?: string,
): Promise<void> {
  await apiRequest(`/quizzes/${quizId}/reject`, {
    method: "POST",
    body: { reason: reason?.trim() || null },
  });
}

export async function addQuizQuestion(
  quizId: number,
  input: AddQuizQuestionInput,
): Promise<ManageQuiz> {
  return apiRequest<ManageQuiz>(`/quizzes/${quizId}/questions`, {
    method: "POST",
    body: buildQuizQuestionPayload(input),
  });
}

export async function updateQuizQuestion(
  quizId: number,
  questionId: number,
  input: UpdateQuizQuestionInput,
): Promise<ManageQuiz> {
  return apiRequest<ManageQuiz>(`/quizzes/${quizId}/questions/${questionId}`, {
    method: "PUT",
    body: buildQuizQuestionPayload(input),
  });
}

export async function attachBankQuestion(
  quizId: number,
  input: AttachBankQuestionInput,
): Promise<ManageQuiz> {
  return apiRequest<ManageQuiz>(`/quizzes/${quizId}/questions/from-bank`, {
    method: "POST",
    body: {
      questionId: input.questionId,
      marks: input.marks ?? null,
    },
  });
}

export async function removeQuizQuestion(
  quizId: number,
  questionId: number,
): Promise<ManageQuiz> {
  return apiRequest<ManageQuiz>(`/quizzes/${quizId}/questions/${questionId}`, {
    method: "DELETE",
  });
}

export async function assignQuiz(
  quizId: number,
  input: AssignQuizInput,
): Promise<void> {
  await apiRequest(`/quizzes/${quizId}/assign`, {
    method: "POST",
    body: {
      mode: input.mode,
      studentIds: input.studentIds.length > 0 ? input.studentIds : null,
      groupId: input.groupId,
      startAt: input.startAt,
      endAt: input.endAt,
      allowedAttempts: input.allowedAttempts,
      gradeId: input.gradeId,
    },
  });
}

export async function listQuizAssignments(
  quizId: number,
): Promise<QuizAssignment[]> {
  const response = await apiRequest<{ items: QuizAssignment[] }>(
    `/quizzes/${quizId}/assignments`,
  );

  return response.items;
}

export async function cancelQuizAssignments(quizId: number): Promise<void> {
  await apiRequest(`/quizzes/${quizId}/cancel`, { method: "POST" });
}

export interface AllowRetryResponse {
  assignmentId: number;
  quizId: number;
  studentId: number;
  allowedAttempts: number;
  attemptCount: number;
  isReviewDone: boolean;
}

export async function allowRetry(
  quizId: number,
  assignmentId: number,
  extraAttempts = 1,
): Promise<AllowRetryResponse> {
  return apiRequest<AllowRetryResponse>(
    `/quizzes/${quizId}/assignments/${assignmentId}/allow-retry`,
    {
      method: "POST",
      body: { extraAttempts },
    },
  );
}
