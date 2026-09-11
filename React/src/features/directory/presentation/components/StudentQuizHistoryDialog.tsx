import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Eye, History, RefreshCw } from "lucide-react";
import { AppEmptyState } from "@/components/ui/app-empty-state";
import { AppErrorState } from "@/components/ui/app-error-state";
import { AppLoadingSkeleton } from "@/components/ui/app-loading-skeleton";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import { Button } from "@/components/ui/button";
import { formatMonitorStatus } from "@/features/quizzes/domain/quizMonitorTypes";
import { useStudentQuizHistoryReportQuery } from "@/features/reports/presentation/hooks/useReportQueries";

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

interface StudentQuizHistoryDialogProps {
  studentId: number;
  studentName: string;
  onClose: () => void;
}

/** Quiz history for a directory student (admin / school scope). */
export function StudentQuizHistoryDialog({
  studentId,
  studentName,
  onClose,
}: StudentQuizHistoryDialogProps) {
  const { data, isLoading, error, refetch, isFetching } =
    useStudentQuizHistoryReportQuery(studentId, studentId > 0);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const displayName = data?.studentName?.trim() || studentName;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close quiz history"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-quiz-history-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2
              id="student-quiz-history-title"
              className="text-lg font-semibold text-slate-900"
            >
              Quiz history
            </h2>
            <p className="mt-0.5 truncate text-sm text-slate-600">
              All quizzes for {displayName}.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error ? (
            <AppErrorState
              message={error.message}
              onRetry={() => void refetch()}
            />
          ) : null}

          {isLoading ? (
            <AppLoadingSkeleton variant="table" count={5} />
          ) : !data && !error ? (
            <AppEmptyState
              icon={History}
              title="Quiz history unavailable"
              description="Unable to load quiz history."
            />
          ) : data && data.items.length === 0 ? (
            <AppEmptyState
              icon={History}
              title="No quiz history yet"
              description="When this student is assigned quizzes and submits, they will show up here."
            />
          ) : data ? (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Quiz
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Best %
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Result
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Last submitted
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.items.map((item) => (
                      <tr
                        key={`${item.quizId}-${item.attemptId ?? 0}`}
                        className="hover:bg-slate-50/80"
                      >
                        <td className="px-3 py-2.5 font-medium text-slate-900">
                          {item.quizTitle}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-800">
                          {item.bestPercentage == null
                            ? "—"
                            : `${item.bestPercentage}%`}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                            <AppStatusBadge
                              status={item.resultStatus}
                              label={formatMonitorStatus(item.resultStatus)}
                            />
                            {item.isReviewDone ? (
                              <span className="text-xs text-slate-500">
                                – Reviewed
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-500">
                          {formatDateTime(item.lastSubmittedAt)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {item.attemptId ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1.5 rounded-full px-2.5 text-[11px] font-semibold leading-none"
                              asChild
                            >
                              <Link
                                to={`/quizzes/${item.quizId}/attempts/${item.attemptId}/review`}
                                onClick={onClose}
                              >
                                <Eye className="!size-3.5" aria-hidden />
                                View result
                              </Link>
                            </Button>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
