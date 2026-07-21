import { Link } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import {
  displayStudentName,
  type PendingReviewItem,
} from "@/features/quizzes/domain/quizMonitorTypes";
import { usePendingReviewsQuery } from "@/features/quizzes/presentation/hooks/useQuizQueries";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/** Queue of quiz attempts awaiting manual grading. */
export function PendingReviewsPage() {
  const { data: items = [], isLoading, error, refetch, isFetching } =
    usePendingReviewsQuery();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Pending quiz reviews"
        description="Review submitted attempts that require teacher or parent marking."
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
        {isLoading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            Loading pending reviews...
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            No attempts are waiting for review.
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
                    Student
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Attempt
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Score
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Submitted
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item: PendingReviewItem) => (
                  <tr key={item.attemptId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {item.quizTitle}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {displayStudentName(item.studentName, item.studentId)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      #{item.attemptNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.obtainedMarks}/{item.totalMarks}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDateTime(item.submittedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/quizzes/${item.quizId}/attempts/${item.attemptId}/review`}
                        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700"
                      >
                        Review
                      </Link>
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
