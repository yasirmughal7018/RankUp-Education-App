import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { downloadCsv } from "@/core/utils/csv";
import {
  buildQuizMonitoringCsv,
  displayStudentName,
  formatIntegrityCounters,
  formatMonitorStatus,
  getMonitorStatusTone,
  studentAttemptCheckPath,
  attemptReviewActionLabel,
  hasAttemptScoreAccess,
} from "@/features/quizzes/domain/quizMonitorTypes";
import {
  useCompleteQuizAttemptMutation,
  useQuizMonitoringQuery,
} from "@/features/quizzes/presentation/hooks/useQuizQueries";
import { StatusBadge } from "@/features/questions/presentation/components/StatusBadge";

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/** Live snapshot of in-progress attempts for one quiz. */
export function QuizMonitoringPage() {
  const { quizId } = useParams();
  const numericQuizId = Number(quizId);

  const {
    data: monitoring,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuizMonitoringQuery(numericQuizId);
  const completeAttempt = useCompleteQuizAttemptMutation(numericQuizId);
  const [completeAttemptId, setCompleteAttemptId] = useState<number | null>(
    null,
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-600 sm:px-6">
        Loading monitoring data...
      </div>
    );
  }

  if (!monitoring) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <PageHeader
          title="Monitoring unavailable"
          description={error?.message}
          backTo={`/quizzes/${quizId}`}
          backAriaLabel="Back to quiz"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title={`Monitor: ${monitoring.quizTitle}`}
        description="Track student submissions, review progress, and attempt status."
        backTo={`/quizzes/${monitoring.quizId}`}
        backAriaLabel="Back to quiz"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {monitoring.students.length > 0 ? (
              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    `quiz-${monitoring.quizId}-monitoring.csv`,
                    buildQuizMonitoringCsv(monitoring),
                  )
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Export CSV
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
            >
              Refresh
            </button>
          </div>
        }
      />

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Students</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {monitoring.totalStudents}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Submitted</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {monitoring.submittedCount}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Pending review
          </p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">
            {monitoring.pendingReviewCount}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Reviewed</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">
            {monitoring.reviewedCount}
          </p>
        </div>
      </section>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {monitoring.students.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            No assigned students to monitor yet.
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
                    Last submitted
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Integrity
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Review
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {monitoring.students.map((student) => (
                  <tr key={student.assignmentId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {displayStudentName(student.studentName, student.studentId)}
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
                      {formatDateTime(student.lastSubmittedAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {(() => {
                        const integrity = formatIntegrityCounters(
                          student.focusLossCount,
                          student.clipboardPasteCount,
                        );
                        if (!integrity) {
                          return <span className="text-slate-400">—</span>;
                        }

                        return (
                          <StatusBadge
                            label={integrity}
                            tone={
                              (student.focusLossCount ?? 0) > 2 ||
                              (student.clipboardPasteCount ?? 0) > 0
                                ? "warning"
                                : "default"
                            }
                          />
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {student.lastAttemptId ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={studentAttemptCheckPath(
                              monitoring.quizId,
                              student.lastAttemptId,
                              "monitoring",
                            )}
                            className={
                              hasAttemptScoreAccess(student.canScore)
                                ? "rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700"
                                : "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                            }
                          >
                            {attemptReviewActionLabel(
                              hasAttemptScoreAccess(student.canScore),
                            )}
                          </Link>
                          {student.isReviewDone ? (
                            <StatusBadge label="Completed" tone="success" />
                          ) : hasAttemptScoreAccess(student.canScore) ? (
                            <button
                              type="button"
                              disabled={completeAttempt.isPending}
                              onClick={() =>
                                setCompleteAttemptId(student.lastAttemptId)
                              }
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                            >
                              Completed
                            </button>
                          ) : null}
                        </div>
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

      <AppConfirmDialog
        open={completeAttemptId != null}
        onOpenChange={(open) => {
          if (!open && !completeAttempt.isPending) {
            setCompleteAttemptId(null);
          }
        }}
        title="Mark quiz completed"
        description="This releases the full result to the student. Auto-graded answers already visible after the due date stay visible."
        confirmLabel="Completed"
        loading={completeAttempt.isPending}
        onConfirm={() => {
          if (completeAttemptId == null) {
            return;
          }
          void completeAttempt
            .mutateAsync(completeAttemptId)
            .then(() => setCompleteAttemptId(null));
        }}
      />
    </div>
  );
}
