import { useMemo, useState } from "react";
import { PageHeader } from "@/core/components/PageHeader";
import { downloadCsv, toCsv } from "@/core/utils/csv";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import { StatusBadge } from "@/features/questions/presentation/components/StatusBadge";
import {
  displayStudentName,
  formatMonitorStatus,
  getMonitorStatusTone,
} from "@/features/quizzes/domain/quizMonitorTypes";
import { ScheduledExportsPanel } from "@/features/reports/presentation/components/ScheduledExportsPanel";
import { SimpleBarChart } from "@/features/reports/presentation/components/SimpleBarChart";
import { SimpleLineChart } from "@/features/reports/presentation/components/SimpleLineChart";
import {
  useQuizPerformanceReportQuery,
  useQuizSummaryReportQuery,
  useRankingsReportQuery,
  useStudentQuizHistoryReportQuery,
} from "@/features/reports/presentation/hooks/useReportQueries";

type ReportTab = "summary" | "rankings" | "performance" | "history";

const TABS: { id: ReportTab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "rankings", label: "Rankings" },
  { id: "performance", label: "Performance" },
  { id: "history", label: "History" },
];

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/** Analytics hub: summaries, performance, rankings, and CSV export. */
export function ReportsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportTab>("summary");
  const [quizFilterInput, setQuizFilterInput] = useState("");
  const [quizFilter, setQuizFilter] = useState<number | "">("");
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [historyStudentInput, setHistoryStudentInput] = useState("");
  const [historyStudentId, setHistoryStudentId] = useState(0);

  const summaryQuery = useQuizSummaryReportQuery({
    from: from || undefined,
    to: to || undefined,
  });
  const rankingsQuery = useRankingsReportQuery(
    quizFilter === "" ? null : quizFilter,
  );
  const performanceQuery = useQuizPerformanceReportQuery(
    typeof quizFilter === "number" ? quizFilter : 0,
    typeof quizFilter === "number",
  );
  const historyQuery = useStudentQuizHistoryReportQuery(
    historyStudentId,
    historyStudentId > 0,
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

  function applyDateRange() {
    setFrom(fromInput);
    setTo(toInput);
  }

  function applyHistoryStudent() {
    const parsed = Number(historyStudentInput.trim());
    setHistoryStudentId(parsed > 0 ? parsed : 0);
  }

  function exportRankingsCsv() {
    const rankings = rankingsQuery.data;
    if (!rankings || rankings.items.length === 0) {
      return;
    }

    const csv = toCsv(
      ["Rank", "Student ID", "Student Name", "Best %", "Attempts"],
      rankings.items.map((item) => [
        item.rank,
        item.studentId,
        displayStudentName(item.studentName, item.studentId),
        item.bestPercentage,
        item.attemptCount,
      ]),
    );
    const suffix = quizFilter === "" ? "overall" : `quiz-${quizFilter}`;
    downloadCsv(`rankings-${suffix}.csv`, csv);
  }

  function exportPerformanceCsv() {
    const performance = performanceQuery.data;
    if (!performance || performance.students.length === 0) {
      return;
    }

    const csv = toCsv(
      [
        "Student ID",
        "Student Name",
        "Attempts",
        "Best %",
        "Status",
        "Review Done",
      ],
      performance.students.map((student) => [
        student.studentId,
        displayStudentName(student.studentName, student.studentId),
        student.attemptCount,
        student.bestPercentage,
        student.status,
        student.isReviewDone ? "Yes" : "No",
      ]),
    );
    downloadCsv(`performance-quiz-${performance.quizId}.csv`, csv);
  }

  function exportHistoryCsv() {
    const history = historyQuery.data;
    if (!history || history.items.length === 0) {
      return;
    }

    const csv = toCsv(
      [
        "Quiz ID",
        "Quiz Title",
        "Attempts",
        "Best %",
        "Status",
        "Review Done",
        "Last Submitted",
      ],
      history.items.map((item) => [
        item.quizId,
        item.quizTitle,
        item.attemptCount,
        item.bestPercentage ?? "",
        item.resultStatus,
        item.isReviewDone ? "Yes" : "No",
        item.lastSubmittedAt ?? "",
      ]),
    );
    downloadCsv(`history-student-${history.studentId}.csv`, csv);
  }

  const summary = summaryQuery.data;
  const rankings = rankingsQuery.data;
  const performance = performanceQuery.data;
  const history = historyQuery.data;

  const summaryChartItems = useMemo(() => {
    if (!summary) {
      return [];
    }
    return [
      { label: "Quizzes", value: summary.totalQuizzes, color: "#2563eb" },
      { label: "Published", value: summary.publishedQuizzes, color: "#0d9488" },
      {
        label: "Assignments",
        value: summary.totalAssignments,
        color: "#7c3aed",
      },
      {
        label: "Submitted",
        value: summary.submittedAttempts,
        color: "#059669",
      },
      {
        label: "Pending",
        value: summary.pendingReviews,
        color: "#d97706",
      },
      {
        label: "Reviewed",
        value: summary.reviewedAssignments,
        color: "#0891b2",
      },
    ];
  }, [summary]);

  const rankingChartItems = useMemo(() => {
    if (!rankings) {
      return [];
    }
    return rankings.items.slice(0, 8).map((item) => ({
      label: displayStudentName(item.studentName, item.studentId),
      value: item.bestPercentage,
    }));
  }, [rankings]);

  const performanceStatusChart = useMemo(() => {
    if (!performance) {
      return [];
    }
    return [
      {
        label: "Submitted",
        value: performance.submittedCount,
        color: "#2563eb",
      },
      {
        label: "Pending",
        value: performance.pendingReviewCount,
        color: "#d97706",
      },
      {
        label: "Reviewed",
        value: performance.reviewedCount,
        color: "#059669",
      },
    ];
  }, [performance]);

  const performanceScoreChart = useMemo(() => {
    if (!performance) {
      return [];
    }
    return performance.students
      .filter((student) => student.bestPercentage != null)
      .slice(0, 10)
      .map((student) => ({
        label: displayStudentName(student.studentName, student.studentId),
        value: student.bestPercentage ?? 0,
      }));
  }, [performance]);

  const historyTrendPoints = useMemo(() => {
    if (!history) {
      return [];
    }
    return history.items
      .filter((item) => item.bestPercentage != null)
      .slice(0, 12)
      .map((item) => ({
        label: item.quizTitle || `Quiz ${item.quizId}`,
        value: item.bestPercentage ?? 0,
      }));
  }, [history]);

  const defaultHistoryHint =
    user?.role === "Student" && user.profileId
      ? String(user.profileId)
      : "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Reports"
        description="Quiz summary, rankings, performance, and student history — with lightweight charts and CSV export."
        action={
          <button
            type="button"
            onClick={() => {
              void summaryQuery.refetch();
              void rankingsQuery.refetch();
              if (typeof quizFilter === "number") {
                void performanceQuery.refetch();
              }
              if (historyStudentId > 0) {
                void historyQuery.refetch();
              }
            }}
            disabled={
              summaryQuery.isFetching ||
              rankingsQuery.isFetching ||
              performanceQuery.isFetching ||
              historyQuery.isFetching
            }
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
          >
            Refresh
          </button>
        }
      />

      <section className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
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
            placeholder="Optional quiz ID for rankings & performance"
            className="min-w-[260px] flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring"
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
        </div>

        <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
          <div>
            <label
              htmlFor="summary-from"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Summary from
            </label>
            <input
              id="summary-from"
              type="date"
              value={fromInput}
              onChange={(event) => setFromInput(event.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label
              htmlFor="summary-to"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Summary to
            </label>
            <input
              id="summary-to"
              type="date"
              value={toInput}
              onChange={(event) => setToInput(event.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="button"
            onClick={applyDateRange}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Apply dates
          </button>
          {from || to ? (
            <button
              type="button"
              onClick={() => {
                setFromInput("");
                setToInput("");
                setFrom("");
                setTo("");
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Clear dates
            </button>
          ) : null}
        </div>
      </section>

      <div
        role="tablist"
        aria-label="Report sections"
        className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={
                isActive
                  ? "rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
                  : "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "summary" ? (
        <div role="tabpanel" className="space-y-6">
          {summaryQuery.error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {summaryQuery.error.message}
            </div>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-lg font-semibold text-slate-900">
              Summary overview
            </h2>
            <p className="mb-4 text-sm text-slate-600">
              Counts from the quiz summary report for the selected date range.
            </p>
            {summaryQuery.isLoading ? (
              <div className="py-10 text-center text-sm text-slate-600">
                Loading chart...
              </div>
            ) : (
              <SimpleBarChart items={summaryChartItems} />
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "rankings" ? (
        <div role="tabpanel" className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-lg font-semibold text-slate-900">
              Top scores
            </h2>
            <p className="mb-4 text-sm text-slate-600">
              Best percentage for the top ranked students
              {quizFilter === "" ? " (overall)." : ` (quiz #${quizFilter}).`}
            </p>
            {rankingsQuery.isLoading ? (
              <div className="py-10 text-center text-sm text-slate-600">
                Loading chart...
              </div>
            ) : (
              <SimpleBarChart
                items={rankingChartItems}
                maxValue={100}
                valueSuffix="%"
                emptyMessage="No ranking data to chart."
              />
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {rankings?.title ?? "Rankings"}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {quizFilter === ""
                    ? "Overall rankings across quizzes in scope."
                    : `Rankings for quiz #${quizFilter}.`}
                </p>
              </div>
              <button
                type="button"
                onClick={exportRankingsCsv}
                disabled={!rankings || rankings.items.length === 0}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Export CSV
              </button>
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
        </div>
      ) : null}

      {activeTab === "performance" ? (
        <div role="tabpanel" className="space-y-6">
          {typeof quizFilter !== "number" ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
              Enter a quiz ID above and apply the filter to load per-quiz
              performance charts and student rows.
            </div>
          ) : (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-1 text-lg font-semibold text-slate-900">
                    Review pipeline
                  </h2>
                  <p className="mb-4 text-sm text-slate-600">
                    Submitted vs pending vs reviewed for this quiz.
                  </p>
                  {performanceQuery.isLoading ? (
                    <div className="py-10 text-center text-sm text-slate-600">
                      Loading chart...
                    </div>
                  ) : (
                    <SimpleBarChart
                      items={performanceStatusChart}
                      emptyMessage="No performance totals to chart."
                    />
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-1 text-lg font-semibold text-slate-900">
                    Student scores
                  </h2>
                  <p className="mb-4 text-sm text-slate-600">
                    Best percentage for students with scored attempts.
                  </p>
                  {performanceQuery.isLoading ? (
                    <div className="py-10 text-center text-sm text-slate-600">
                      Loading chart...
                    </div>
                  ) : (
                    <SimpleLineChart
                      points={performanceScoreChart}
                      maxValue={100}
                      valueSuffix="%"
                      emptyMessage="No scored students to chart."
                    />
                  )}
                </section>
              </div>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {performance?.quizTitle ??
                        `Quiz #${quizFilter} performance`}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Per-student performance for the selected quiz.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={exportPerformanceCsv}
                    disabled={!performance || performance.students.length === 0}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Export CSV
                  </button>
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
            </>
          )}
        </div>
      ) : null}

      {activeTab === "history" ? (
        <div role="tabpanel" className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap gap-2">
              <input
                type="number"
                min={1}
                value={historyStudentInput}
                onChange={(event) => setHistoryStudentInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    applyHistoryStudent();
                  }
                }}
                placeholder={
                  defaultHistoryHint
                    ? `Student ID (yours: ${defaultHistoryHint})`
                    : "Student ID for quiz history"
                }
                className="min-w-[260px] flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={applyHistoryStudent}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                Load history
              </button>
              {user?.role === "Student" && user.profileId ? (
                <button
                  type="button"
                  onClick={() => {
                    setHistoryStudentInput(String(user.profileId));
                    setHistoryStudentId(user.profileId!);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Use my profile
                </button>
              ) : null}
            </div>
          </section>

          {historyStudentId <= 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
              Enter a student ID to load quiz history and score trend.
            </div>
          ) : (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-1 text-lg font-semibold text-slate-900">
                  Score trend
                </h2>
                <p className="mb-4 text-sm text-slate-600">
                  Best percentage across recent quizzes for this student.
                </p>
                {historyQuery.isLoading ? (
                  <div className="py-10 text-center text-sm text-slate-600">
                    Loading chart...
                  </div>
                ) : (
                  <SimpleLineChart
                    points={historyTrendPoints}
                    maxValue={100}
                    valueSuffix="%"
                    emptyMessage="No scored history to chart."
                  />
                )}
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {history
                        ? `${history.studentName || `Student ${history.studentId}`} — history`
                        : `Student #${historyStudentId} history`}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Quiz attempts and results for the selected student.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={exportHistoryCsv}
                    disabled={!history || history.items.length === 0}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Export CSV
                  </button>
                </div>

                {historyQuery.error ? (
                  <div className="px-5 py-4 text-sm text-red-700">
                    {historyQuery.error.message}
                  </div>
                ) : historyQuery.isLoading ? (
                  <div className="px-6 py-10 text-center text-sm text-slate-600">
                    Loading history...
                  </div>
                ) : !history || history.items.length === 0 ? (
                  <div className="px-6 py-10 text-center text-sm text-slate-600">
                    No quiz history for this student.
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
                            Status
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-slate-600">
                            Review
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-slate-600">
                            Last submitted
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {history.items.map((item) => (
                          <tr key={`${item.quizId}-${item.attemptId ?? 0}`}>
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {item.quizTitle || `Quiz #${item.quizId}`}
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
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {item.isReviewDone ? "Done" : "Pending"}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {formatDateTime(item.lastSubmittedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      ) : null}

      <div className="mt-8">
        <ScheduledExportsPanel />
      </div>
    </div>
  );
}
