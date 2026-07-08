import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { useChildQuizHistoryQuery } from "@/features/parent/presentation/hooks/useParentQueries";
import { StatusBadge } from "@/features/questions/presentation/components/StatusBadge";
import {
  formatMonitorStatus,
  getMonitorStatusTone,
} from "@/features/quizzes/domain/quizMonitorTypes";

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ParentChildHistoryPage() {
  const { studentId } = useParams();
  const numericStudentId = Number(studentId);
  const { data, isLoading, error, refetch, isFetching } =
    useChildQuizHistoryQuery(numericStudentId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-slate-600 sm:px-6">
        Loading quiz history...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <PageHeader
          title="Quiz history unavailable"
          description={error?.message ?? "Unable to load quiz history."}
        />
        <Link
          to="/parent/children"
          className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
        >
          Back to children
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader
        title={`${data.studentName || `Student ${data.studentId}`} — quiz history`}
        description="Submitted quiz attempts and results for this linked student."
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
            >
              Refresh
            </button>
            <Link
              to="/parent/children"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Back to children
            </Link>
          </div>
        }
      />

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {data.items.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            No quiz history for this student yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Quiz
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Attempts
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Best %
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Result
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Last submitted
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.items.map((item) => (
                  <tr key={`${item.quizId}-${item.attemptId ?? 0}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {item.quizTitle}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.attemptCount}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.bestPercentage ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={formatMonitorStatus(item.resultStatus)}
                        tone={getMonitorStatusTone(item.resultStatus)}
                      />
                      {item.isReviewDone ? (
                        <p className="mt-1 text-xs text-emerald-700">Reviewed</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDateTime(item.lastSubmittedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.attemptId ? (
                        <Link
                          to={`/parent/children/${data.studentId}/quizzes/${item.quizId}/attempts/${item.attemptId}/result`}
                          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700"
                        >
                          View result
                        </Link>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
