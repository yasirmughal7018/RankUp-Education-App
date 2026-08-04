/** React Query hooks for analytics and rankings reports. */
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/core/api/queryKeys";
import * as reportApi from "@/features/reports/data/reportApi";

/** Aggregate quiz metrics for a date range. */
export function useQuizSummaryReportQuery(
  options?: { from?: string; to?: string },
  enabled = true,
) {
  const from = options?.from || undefined;
  const to = options?.to || undefined;

  return useQuery({
    queryKey: queryKeys.reportQuizSummary(from, to),
    queryFn: () => reportApi.getQuizSummaryReport({ from, to }),
    enabled,
  });
}

/** Per-student performance for one quiz. */
export function useQuizPerformanceReportQuery(quizId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.reportQuizPerformance(quizId),
    queryFn: () => reportApi.getQuizPerformanceReport(quizId),
    enabled: enabled && quizId > 0,
  });
}

/** Leaderboard, optionally scoped to a quiz. */
export function useRankingsReportQuery(quizId?: number | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.reportRankings(quizId),
    queryFn: () => reportApi.getRankingsReport(quizId),
    enabled,
  });
}

/** Quiz history for one student. */
export function useStudentQuizHistoryReportQuery(
  studentId: number,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.studentQuizHistory(studentId),
    queryFn: () => reportApi.getStudentQuizHistory(studentId),
    enabled: enabled && studentId > 0,
  });
}
