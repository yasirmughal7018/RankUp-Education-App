/** Student quiz-taking HTTP client — start, draft, submit, results. */
import { apiRequest } from "@/core/api/apiClient";
import type {
  QuizAttemptResult,
  QuizDetail,
  SaveQuizDraftInput,
  SaveQuizDraftResult,
  StartQuizAttempt,
  SubmitQuizAnswer,
  SyncOfflineQuizAttemptInput,
  SyncOfflineQuizAttemptResult,
} from "@/features/student/domain/studentQuizTypes";
import { getStudentDeviceId } from "@/features/student/domain/studentQuizTypes";

/** Quiz overview before starting an attempt. */
export async function getQuizDetail(quizId: number): Promise<QuizDetail> {
  return apiRequest<QuizDetail>(`/quizzes/${quizId}`);
}

/** Start or resume attempt (sends stable per-browser device id). */
export async function startQuizAttempt(
  quizId: number,
  options?: { instructionsAcknowledged?: boolean },
): Promise<StartQuizAttempt> {
  return apiRequest<StartQuizAttempt>(`/quizzes/${quizId}/attempts`, {
    method: "POST",
    body: {
      deviceId: getStudentDeviceId(),
      instructionsAcknowledged: options?.instructionsAcknowledged ?? false,
    },
  });
}

/** Autosave answers, elapsed time, and anti-cheat deltas. */
export async function saveQuizAttemptDraft(
  quizId: number,
  attemptId: number,
  input: SaveQuizDraftInput,
  options?: { keepalive?: boolean },
): Promise<SaveQuizDraftResult> {
  return apiRequest<SaveQuizDraftResult>(
    `/quizzes/${quizId}/attempts/${attemptId}/draft`,
    {
      method: "PUT",
      keepalive: options?.keepalive === true,
      body: {
        answers: input.answers,
        timeSpentSeconds: input.timeSpentSeconds ?? null,
        focusLossDelta: input.focusLossDelta ?? null,
        clipboardPasteDelta: input.clipboardPasteDelta ?? null,
        deviceId: input.deviceId ?? getStudentDeviceId(),
        isOfflineSync: input.isOfflineSync ?? false,
        clientSyncId: input.clientSyncId ?? null,
      },
    },
  );
}

/** Submit attempt for auto/manual grading. */
export async function submitQuizAttempt(
  quizId: number,
  attemptId: number,
  answers: SubmitQuizAnswer[],
  timeSpentSeconds: number,
  isAutoSubmit = false,
  options?: { isOfflineSync?: boolean; clientSyncId?: string | null },
): Promise<QuizAttemptResult> {
  return apiRequest<QuizAttemptResult>(
    `/quizzes/${quizId}/attempts/${attemptId}/submit`,
    {
      method: "POST",
      body: {
        answers,
        timeSpentSeconds,
        isAutoSubmit,
        deviceId: getStudentDeviceId(),
        isOfflineSync: options?.isOfflineSync ?? false,
        clientSyncId: options?.clientSyncId ?? null,
      },
    },
  );
}

/** Replay a queued offline draft or submit after reconnect. */
export async function syncOfflineQuizAttempt(
  quizId: number,
  attemptId: number,
  input: SyncOfflineQuizAttemptInput,
): Promise<SyncOfflineQuizAttemptResult> {
  return apiRequest<SyncOfflineQuizAttemptResult>(
    `/quizzes/${quizId}/attempts/${attemptId}/sync`,
    {
      method: "POST",
      body: {
        clientSyncId: input.clientSyncId,
        answers: input.answers,
        timeSpentSeconds: input.timeSpentSeconds,
        deviceId: input.deviceId ?? getStudentDeviceId(),
        submit: input.submit ?? false,
        isAutoSubmit: input.isAutoSubmit ?? false,
        focusLossDelta: input.focusLossDelta ?? null,
        clipboardPasteDelta: input.clipboardPasteDelta ?? null,
      },
    },
  );
}

/** Fetch graded result for an attempt. */
export async function getQuizAttemptResult(
  quizId: number,
  attemptId: number,
): Promise<QuizAttemptResult> {
  return apiRequest<QuizAttemptResult>(
    `/quizzes/${quizId}/attempts/${attemptId}/result`,
  );
}
