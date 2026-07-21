/** Student quiz-taking HTTP client — start, draft, submit, results. */
import { apiRequest } from "@/core/api/apiClient";
import type {
  QuizAttemptResult,
  QuizDetail,
  SaveQuizDraftInput,
  SaveQuizDraftResult,
  StartQuizAttempt,
  SubmitQuizAnswer,
} from "@/features/student/domain/studentQuizTypes";
import { STUDENT_DEVICE_ID } from "@/features/student/domain/studentQuizTypes";

/** Quiz overview before starting an attempt. */
export async function getQuizDetail(quizId: number): Promise<QuizDetail> {
  return apiRequest<QuizDetail>(`/quizzes/${quizId}`);
}

/** Start or resume attempt (sends web device id). */
export async function startQuizAttempt(quizId: number): Promise<StartQuizAttempt> {
  return apiRequest<StartQuizAttempt>(`/quizzes/${quizId}/attempts`, {
    method: "POST",
    body: { deviceId: STUDENT_DEVICE_ID },
  });
}

/** Autosave answers and elapsed time. */
export async function saveQuizAttemptDraft(
  quizId: number,
  attemptId: number,
  input: SaveQuizDraftInput,
): Promise<SaveQuizDraftResult> {
  return apiRequest<SaveQuizDraftResult>(
    `/quizzes/${quizId}/attempts/${attemptId}/draft`,
    {
      method: "PUT",
      body: {
        answers: input.answers,
        timeSpentSeconds: input.timeSpentSeconds ?? null,
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
): Promise<QuizAttemptResult> {
  return apiRequest<QuizAttemptResult>(
    `/quizzes/${quizId}/attempts/${attemptId}/submit`,
    {
      method: "POST",
      body: { answers, timeSpentSeconds },
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
