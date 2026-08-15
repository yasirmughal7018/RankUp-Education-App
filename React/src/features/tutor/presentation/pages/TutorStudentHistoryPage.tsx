import { useParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { useTutorStudentHistoryQuery } from "@/features/tutor/presentation/hooks/useTutorQueries";
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

export function TutorStudentHistoryPage() {
  const { studentId } = useParams();
  const numericStudentId = Number(studentId);
  const { data, isLoading, error, refetch, isFetching } =
    useTutorStudentHistoryQuery(numericStudentId);

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
          backTo="/tutor/students"
          backAriaLabel="Back to students"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader
        title={`${data.studentName || `Student ${data.studentId}`} — quiz history`}
        description="Attempts on quizzes you created for this linked student."
        backTo="/tutor/students"
        backAriaLabel="Back to students"
        action={
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
          >
            Refresh
          </button>
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
            No history for your quizzes yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Quiz</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Best</th>
                  <th className="px-5 py-3">Last submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((item) => (
                  <tr key={`${item.quizId}-${item.attemptId ?? "none"}`}>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {item.quizTitle}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        label={formatMonitorStatus(item.resultStatus)}
                        tone={getMonitorStatusTone(item.resultStatus)}
                      />
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {item.bestPercentage == null
                        ? "—"
                        : `${item.bestPercentage}%`}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {formatDateTime(item.lastSubmittedAt)}
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
