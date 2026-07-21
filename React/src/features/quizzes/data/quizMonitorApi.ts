/**
 * Quiz monitoring HTTP client — assignment board, live monitoring, attempt review.
 */
import { apiRequest } from "@/core/api/apiClient";
import type {
  AssignmentBoardItem,
  AttemptReview,
  MarkAttemptAnswerInput,
  PendingReviewItem,
  QuizMonitoring,
} from "@/features/quizzes/domain/quizMonitorTypes";

/** Cross-quiz assignment list; optional student filter for parents. */
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

/** Attempts awaiting manual grading. */
export async function listPendingReviews(): Promise<PendingReviewItem[]> {
  const response = await apiRequest<{ items: PendingReviewItem[] }>(
    "/quizzes/reviews/pending",
  );

  return response.items;
}

/** Live progress snapshot for a published quiz. */
export async function getQuizMonitoring(quizId: number): Promise<QuizMonitoring> {
  return apiRequest<QuizMonitoring>(`/quizzes/${quizId}/monitoring`);
}

/** Full attempt detail for the review UI. */
export async function getAttemptReview(
  quizId: number,
  attemptId: number,
): Promise<AttemptReview> {
  return apiRequest<AttemptReview>(
    `/quizzes/${quizId}/attempts/${attemptId}/review`,
  );
}

/** Save awarded marks and feedback for manually graded answers. */
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

/** Lock in review marks and release results to the student. */
export async function finalizeAttemptReview(
  quizId: number,
  attemptId: number,
): Promise<void> {
  await apiRequest(`/quizzes/${quizId}/attempts/${attemptId}/finalize-review`, {
    method: "POST",
  });
}
