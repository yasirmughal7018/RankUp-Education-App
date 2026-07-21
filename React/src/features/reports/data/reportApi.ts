/** Reports HTTP client — summaries, performance, rankings, history. */
import { apiRequest } from "@/core/api/apiClient";
import type {
  QuizPerformanceReport,
  QuizSummaryReport,
  RankingReport,
  StudentQuizHistory,
} from "@/features/reports/domain/reportTypes";

function toQuery(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/** Aggregate quiz metrics for optional date range. */
export async function getQuizSummaryReport(options?: {
  from?: string;
  to?: string;
}): Promise<QuizSummaryReport> {
  return apiRequest<QuizSummaryReport>(
    `/reports/quiz-summary${toQuery({
      from: options?.from,
      to: options?.to,
    })}`,
  );
}

/** Per-student stats for one quiz. */
export async function getQuizPerformanceReport(
  quizId: number,
): Promise<QuizPerformanceReport> {
  return apiRequest<QuizPerformanceReport>(
    `/reports/quizzes/${quizId}/performance`,
  );
}

/** Leaderboard, optionally filtered by quiz. */
export async function getRankingsReport(
  quizId?: number | null,
): Promise<RankingReport> {
  return apiRequest<RankingReport>(
    `/reports/rankings${toQuery({ quizId })}`,
  );
}

/** All quiz attempts for one student. */
export async function getStudentQuizHistory(
  studentId: number,
): Promise<StudentQuizHistory> {
  return apiRequest<StudentQuizHistory>(
    `/reports/students/${studentId}/quiz-history`,
  );
}
