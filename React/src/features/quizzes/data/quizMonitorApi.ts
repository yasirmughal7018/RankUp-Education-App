import { apiRequest } from "@/core/api/apiClient";
import type {
  AssignmentBoardItem,
  AttemptReview,
  MarkAttemptAnswerInput,
  PendingReviewItem,
  QuizMonitoring,
} from "@/features/quizzes/domain/quizMonitorTypes";

export async function listAssignmentBoard(
  studentId?: number | null,
): Promise<AssignmentBoardItem[]> {
  const params = new URLSearchParams();
  if (studentId != null) {
    params.set("studentId", String(studentId));
  }

  const query = params.toString();
  const response = await apiRequest<{ items: AssignmentBoardItem[] }>(
    `/quizzes/assignments${query ? `?${query}` : ""}`,
  );

  return response.items;
}

export async function listPendingReviews(): Promise<PendingReviewItem[]> {
  const response = await apiRequest<{ items: PendingReviewItem[] }>(
    "/quizzes/reviews/pending",
  );

  return response.items;
}

export async function getQuizMonitoring(quizId: number): Promise<QuizMonitoring> {
  return apiRequest<QuizMonitoring>(`/quizzes/${quizId}/monitoring`);
}

export async function getAttemptReview(
  quizId: number,
  attemptId: number,
): Promise<AttemptReview> {
  return apiRequest<AttemptReview>(
    `/quizzes/${quizId}/attempts/${attemptId}/review`,
  );
}

export async function markAttemptAnswers(
  quizId: number,
  attemptId: number,
  answers: MarkAttemptAnswerInput[],
): Promise<AttemptReview> {
  return apiRequest<AttemptReview>(
    `/quizzes/${quizId}/attempts/${attemptId}/answers`,
    {
      method: "PUT",
      body: { answers },
    },
  );
}

export async function finalizeAttemptReview(
  quizId: number,
  attemptId: number,
): Promise<void> {
  await apiRequest(`/quizzes/${quizId}/attempts/${attemptId}/finalize-review`, {
    method: "POST",
  });
}
