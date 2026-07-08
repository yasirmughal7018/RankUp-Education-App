import { apiRequest } from "@/core/api/apiClient";
import type {
  QuizAttemptResult,
  QuizDetail,
  StartQuizAttempt,
  SubmitQuizAnswer,
} from "@/features/student/domain/studentQuizTypes";
import { STUDENT_DEVICE_ID } from "@/features/student/domain/studentQuizTypes";

export async function getQuizDetail(quizId: number): Promise<QuizDetail> {
  return apiRequest<QuizDetail>(`/quizzes/${quizId}`);
}

export async function startQuizAttempt(quizId: number): Promise<StartQuizAttempt> {
  return apiRequest<StartQuizAttempt>(`/quizzes/${quizId}/attempts`, {
    method: "POST",
    body: { deviceId: STUDENT_DEVICE_ID },
  });
}

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

export async function getQuizAttemptResult(
  quizId: number,
  attemptId: number,
): Promise<QuizAttemptResult> {
  return apiRequest<QuizAttemptResult>(
    `/quizzes/${quizId}/attempts/${attemptId}/result`,
  );
}
