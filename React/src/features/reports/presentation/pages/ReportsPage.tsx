import { useState } from "react";
import { PageHeader } from "@/core/components/PageHeader";
import { StatusBadge } from "@/features/questions/presentation/components/StatusBadge";
import {
  displayStudentName,
  formatMonitorStatus,
  getMonitorStatusTone,
} from "@/features/quizzes/domain/quizMonitorTypes";
import {
  useQuizPerformanceReportQuery,
  useQuizSummaryReportQuery,
  useRankingsReportQuery,
} from "@/features/reports/presentation/hooks/useReportQueries";

export function ReportsPage() {
  const [quizFilterInput, setQuizFilterInput] = useState("");
  const [quizFilter, setQuizFilter] = useState<number | "">("");

  const summaryQuery = useQuizSummaryReportQuery();
  const rankingsQuery = useRankingsReportQuery(
    quizFilter === "" ? null : quizFilter,
  );
  const performanceQuery = useQuizPerformanceReportQuery(
    typeof quizFilter === "number" ? quizFilter : 0,
    typeof quizFilter === "number",
  );

  function applyQuizFilter() {
    const value = quizFilterInput.trim();
    if (!value) {
      setQuizFilter("");
      return;
    }

    const parsed = Number(value);
    setQuizFilter(parsed > 0 ? parsed : "");
  }

  const summary = summaryQuery.data;
  const rankings = rankingsQuery.data;
  const performance = performanceQuery.data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Reports"
        description="Quiz summary metrics, rankings, and optional per-quiz performance."
        action={
          <button
            type="button"
            onClick={() => {
              void summaryQuery.refetch();
              void rankingsQuery.refetch();
              if (typeof quizFilter === "number") {
                void performanceQuery.refetch();
              }
            }}
            disabled={
              summaryQuery.isFetching ||
              rankingsQuery.isFetching ||
              performanceQuery.isFetching
            }
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
          >
            Refresh
          </button>
        }
      />

      <section className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4">
        <input
          type="number"
          min={1}
          value={quizFilterInput}
          onChange={(event) => setQuizFilterInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              applyQuizFilter();
            }
          }}
          placeholder="Optional quiz ID for performance & rankings"
          className="min-w-[260px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={applyQuizFilter}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          Apply filter
        </button>
        {quizFilter !== "" ? (
          <button
            type="button"
            onClick={() => {
              setQuizFilterInput("");
              setQuizFilter("");
            }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Clear
          </button>
        ) : null}
      </section>

      {summaryQuery.error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {summaryQuery.error.message}
        </div>
      ) : null}

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total quizzes", value: summary?.totalQuizzes },
          { label: "Published", value: summary?.publishedQuizzes },
          { label: "Assignments", value: summary?.totalAssignments },
          { label: "Submitted attempts", value: summary?.submittedAttempts },
          { label: "Pending reviews", value: summary?.pendingReviews },
          { label: "Reviewed", value: summary?.reviewedAssignments },
          {
            label: "Average %",
            value:
              summary?.averagePercentage == null
                ? "—"
                : `${summary.averagePercentage}%`,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {summaryQuery.isLoading ? "…" : (card.value ?? "—")}
            </p>
          </div>
        ))}
      </section>

      <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {rankings?.title ?? "Rankings"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {quizFilter === ""
              ? "Overall rankings across quizzes in scope."
              : `Rankings for quiz #${quizFilter}.`}
          </p>
        </div>

        {rankingsQuery.error ? (
          <div className="px-5 py-4 text-sm text-red-700">
            {rankingsQuery.error.message}
          </div>
        ) : rankingsQuery.isLoading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            Loading rankings...
          </div>
        ) : !rankings || rankings.items.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            No ranking data available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Best %
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Attempts
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rankings.items.map((item) => (
                  <tr key={`${item.rank}-${item.studentId}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      #{item.rank}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {displayStudentName(item.studentName, item.studentId)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.bestPercentage}%
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.attemptCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {typeof quizFilter === "number" ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {performance?.quizTitle ?? `Quiz #${quizFilter} performance`}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Per-student performance for the selected quiz.
            </p>
          </div>

          {performanceQuery.error ? (
            <div className="px-5 py-4 text-sm text-red-700">
              {performanceQuery.error.message}
            </div>
          ) : performanceQuery.isLoading ? (
            <div className="px-6 py-10 text-center text-sm text-slate-600">
              Loading performance...
            </div>
          ) : !performance ? (
            <div className="px-6 py-10 text-center text-sm text-slate-600">
              No performance data for this quiz.
            </div>
          ) : (
            <>
              <div className="grid gap-4 border-b border-slate-200 p-5 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Students
                  </p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">
                    {performance.totalStudents}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Submitted
                  </p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">
                    {performance.submittedCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Pending review
                  </p>
                  <p className="mt-1 text-xl font-semibold text-amber-700">
                    {performance.pendingReviewCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Reviewed
                  </p>
                  <p className="mt-1 text-xl font-semibold text-emerald-700">
                    {performance.reviewedCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Average %
                  </p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">
                    {performance.averagePercentage ?? "—"}
                  </p>
                </div>
              </div>

              {performance.students.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-slate-600">
                  No students in this performance report.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">
                          Student
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">
                          Attempts
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">
                          Best %
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">
                          Review
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {performance.students.map((student) => (
                        <tr key={student.studentId}>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {displayStudentName(
                              student.studentName,
                              student.studentId,
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {student.attemptCount}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {student.bestPercentage ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge
                              label={formatMonitorStatus(student.status)}
                              tone={getMonitorStatusTone(student.status)}
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {student.isReviewDone ? "Done" : "Pending"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
