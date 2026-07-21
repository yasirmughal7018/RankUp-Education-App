/**
 * Question bank HTTP client — list/CRUD, 3-tier approve/reject, PortalAdmin lifecycle, Excel import.
 */
import { apiRequest, apiRequestVoid } from "@/core/api/apiClient";
import { environment } from "@/app/environment";
import { readStoredSession } from "@/core/auth/tokenStorage";
import type {
  QuestionDetail,
  QuestionFormValues,
  QuestionListFilters,
  QuestionSummary,
} from "@/features/questions/domain/questionTypes";
import { buildQuestionPayload } from "@/features/questions/domain/questionTypes";

/** Build GET /questions query string from optional filters. */
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

  if (filters.eligibleForQuizOnly) {
    params.set("eligibleForQuizOnly", "true");
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

/** List questions visible to the current user (server applies org scope). */
export async function listQuestions(
  filters: QuestionListFilters = {},
): Promise<QuestionSummary[]> {
  const response = await apiRequest<{ items: QuestionSummary[] }>(
    `/questions${buildListQuery(filters)}`,
  );

  return response.items;
}

/** Dedicated pending-approval endpoint for approver queues. */
export async function listPendingApprovalQuestions(): Promise<QuestionSummary[]> {
  const response = await apiRequest<{ items: QuestionSummary[] }>(
    "/questions/pending-approval",
  );

  return response.items;
}

export async function getQuestion(questionId: number): Promise<QuestionDetail> {
  return apiRequest<QuestionDetail>(`/questions/${questionId}`);
}

/**
 * Create a question. Default submitForReview=true → PendingReview (inactive until approved).
 */
export async function createQuestion(
  values: QuestionFormValues,
  submitForReview = true,
): Promise<QuestionDetail> {
  return apiRequest<QuestionDetail>("/questions", {
    method: "POST",
    body: {
      ...buildQuestionPayload(values),
      submitForReview,
    },
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

/** Move Rejected (or draft) back into PendingReview. */
export async function submitQuestionForReview(
  questionId: number,
): Promise<QuestionDetail> {
  return apiRequest<QuestionDetail>(`/questions/${questionId}/submit`, {
    method: "POST",
  });
}

/**
 * Approve PendingReview. Server sets visibility by role:
 * CampusAdmin → Campus, SchoolAdmin → School, PortalAdmin → Public.
 */
export async function approveQuestion(questionId: number): Promise<void> {
  await apiRequest(`/questions/${questionId}/approve`, { method: "POST" });
}

export async function rejectQuestion(
  questionId: number,
  reason: string,
): Promise<void> {
  await apiRequest(`/questions/${questionId}/reject`, {
    method: "POST",
    body: { reason },
  });
}

/** PortalAdmin-only: set IsActive=true. */
export async function activateQuestion(questionId: number): Promise<void> {
  await apiRequest(`/questions/${questionId}/activate`, { method: "POST" });
}

/** PortalAdmin-only: set IsActive=false. */
export async function deactivateQuestion(questionId: number): Promise<void> {
  await apiRequest(`/questions/${questionId}/deactivate`, { method: "POST" });
}

/** PortalAdmin-only: archive the question. */
export async function archiveQuestion(questionId: number): Promise<void> {
  await apiRequest(`/questions/${questionId}/archive`, { method: "POST" });
}

export async function deleteQuestion(questionId: number): Promise<void> {
  await apiRequestVoid(`/questions/${questionId}`, { method: "DELETE" });
}

export interface ImportQuestionsResult {
  dryRun: boolean;
  createdCount: number;
  errorCount: number;
  errors: Array<{ rowNumber: number; message: string }>;
  created?: Array<{ status?: string }>;
}

/**
 * Multipart Excel import. dryRun validates without writing;
 * commit always creates PendingReview (never Approved).
 * Uses fetch + FormData (not apiRequest) for file upload.
 */
export async function importQuestionsFromExcel(
  file: File,
  dryRun = false,
): Promise<ImportQuestionsResult> {
  const formData = new FormData();
  formData.append("file", file);

  const token = readStoredSession()?.accessToken;
  const response = await fetch(
    `${environment.apiBaseUrl}/questions/import?dryRun=${dryRun}`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    },
  );

  const payload = (await response.json()) as {
    success?: boolean;
    message?: string;
    data?: ImportQuestionsResult & {
      created?: Array<{ status?: string; Status?: string }>;
      Created?: Array<{ status?: string; Status?: string }>;
    };
    errors?: string[];
  };

  if (!response.ok || payload.success === false) {
    throw new Error(
      payload.message ||
        payload.errors?.[0] ||
        "Unable to import questions from Excel.",
    );
  }

  const data = payload.data;
  if (!data) {
    throw new Error("Unable to import questions from Excel.");
  }

  // Normalize PascalCase / camelCase created rows from the API envelope.
  const rawCreated = data.created ?? data.Created ?? [];
  return {
    dryRun: data.dryRun,
    createdCount: data.createdCount,
    errorCount: data.errorCount,
    errors: data.errors ?? [],
    created: rawCreated.map((item) => ({
      status: item.status ?? item.Status,
    })),
  };
}

/** Absolute URL for the blank Excel import template download. */
export function getQuestionImportTemplateUrl(): string {
  return `${environment.apiBaseUrl}/questions/import-template`;
}
