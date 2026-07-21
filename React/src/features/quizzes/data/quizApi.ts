/**
 * Quiz management HTTP client — CRUD, questions, assignments, approvals.
 */
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

/** List quizzes with optional search and subject/grade filters. */
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

/** Full quiz detail for the manage/edit UI. */
export async function getManageQuiz(quizId: number): Promise<ManageQuiz> {
  return apiRequest<ManageQuiz>(`/quizzes/${quizId}/manage`);
}

/** Create a draft quiz from form values. */
export async function createQuiz(values: QuizFormValues): Promise<ManageQuiz> {
  return apiRequest<ManageQuiz>("/quizzes", {
    method: "POST",
    body: buildQuizPayload(values),
  });
}

/** Update quiz metadata; contextStudentId is create-only and stripped. */
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

/** Permanently delete a quiz. */
export async function deleteQuiz(quizId: number): Promise<void> {
  await apiRequestVoid(`/quizzes/${quizId}`, { method: "DELETE" });
}

/** Publish draft quiz (may require admin approval). */
export async function publishQuiz(quizId: number): Promise<ManageQuiz> {
  return apiRequest<ManageQuiz>(`/quizzes/${quizId}/publish`, {
    method: "POST",
  });
}

/** Clone quiz as a new draft. */
export async function duplicateQuiz(quizId: number): Promise<ManageQuiz> {
  const response = await apiRequest<{ quiz: ManageQuiz }>(
    `/quizzes/${quizId}/duplicate`,
    { method: "POST" },
  );

  return response.quiz;
}

/** Soft-archive a published quiz. */
export async function archiveQuiz(quizId: number): Promise<void> {
  await apiRequest(`/quizzes/${quizId}/archive`, { method: "POST" });
}

/** Admin queue: quizzes awaiting approval. */
export async function listPendingQuizApprovals(): Promise<PendingQuizApproval[]> {
  const response = await apiRequest<{ items: PendingQuizApproval[] }>(
    "/quizzes/pending-approval",
  );

  return response.items;
}

/** Admin: approve a pending quiz. */
export async function approveQuiz(quizId: number): Promise<void> {
  await apiRequest(`/quizzes/${quizId}/approve`, { method: "POST" });
}

/** Admin: reject a pending quiz with optional reason. */
export async function rejectQuiz(
  quizId: number,
  reason?: string,
): Promise<void> {
  await apiRequest(`/quizzes/${quizId}/reject`, {
    method: "POST",
    body: { reason: reason?.trim() || null },
  });
}

/** Add an inline question to the quiz. */
export async function addQuizQuestion(
  quizId: number,
  input: AddQuizQuestionInput,
): Promise<ManageQuiz> {
  return apiRequest<ManageQuiz>(`/quizzes/${quizId}/questions`, {
    method: "POST",
    body: buildQuizQuestionPayload(input),
  });
}

/** Update an existing inline quiz question. */
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

/** Attach a question-bank item to the quiz. */
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

/** Remove a question from the quiz. */
export async function removeQuizQuestion(
  quizId: number,
  questionId: number,
): Promise<ManageQuiz> {
  return apiRequest<ManageQuiz>(`/quizzes/${quizId}/questions/${questionId}`, {
    method: "DELETE",
  });
}

/** Assign quiz to students, a group, or a grade. */
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

/** List active assignments for a quiz. */
export async function listQuizAssignments(
  quizId: number,
): Promise<QuizAssignment[]> {
  const response = await apiRequest<{ items: QuizAssignment[] }>(
    `/quizzes/${quizId}/assignments`,
  );

  return response.items;
}

/** Cancel all assignments for a quiz. */
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

/** Grant extra attempts on a specific assignment. */
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
