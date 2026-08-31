import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/core/components/PageHeader";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import { StatusBadge } from "@/features/questions/presentation/components/StatusBadge";
import {
  getMonitorStatusTone,
  latestCheckableAttemptId,
  studentAttemptCheckPath,
  attemptReviewActionLabel,
  hasAttemptScoreAccess,
} from "@/features/quizzes/domain/quizMonitorTypes";
import {
  useManageQuizQuery,
  useQuizAssignmentsQuery,
} from "@/features/quizzes/presentation/hooks/useQuizQueries";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/** Per-quiz list of assigned students or children. */
export function QuizAssignedPeoplePage() {
  const { quizId } = useParams();
  const { user } = useAuth();
  const numericQuizId = Number(quizId);
  const assignedPeopleLabel =
    user?.role === "Parent" ? "Assigned children" : "Assigned students";

  const {
    data: quiz,
    isLoading: quizLoading,
    error: quizError,
  } = useManageQuizQuery(numericQuizId);
  const {
    data: assignments = [],
    isLoading: assignmentsLoading,
    error: assignmentsError,
    refetch,
    isFetching,
  } = useQuizAssignmentsQuery(numericQuizId, Boolean(quiz));
  if (quizLoading || (quiz && assignmentsLoading)) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-600 sm:px-6">
        Loading {assignedPeopleLabel.toLowerCase()}...
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <PageHeader
          title={`${assignedPeopleLabel} unavailable`}
          description={quizError?.message ?? assignmentsError?.message}
          backTo="/quizzes"
          backAriaLabel="Back to quizzes"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title={`${assignedPeopleLabel}: ${quiz.title}`}
        description={`${quiz.subject} · ${quiz.grade}`}
        backTo={`/quizzes/${quiz.id}`}
        backAriaLabel="Back to quiz"
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

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {assignments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Window
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Result
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {assignments.map((assignment) => (
                  <tr key={assignment.assignmentId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">
                      {assignment.studentName?.trim() || assignment.studentId}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDateTime(assignment.startAt)} -{" "}
                      {formatDateTime(assignment.endAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={
                          assignment.isReviewDone
                            ? `${assignment.resultStatus} · Reviewed`
                            : assignment.resultStatus
                        }
                        tone={getMonitorStatusTone(assignment.resultStatus)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(() => {
                        const attemptId = latestCheckableAttemptId(
                          assignment.attempts,
                        );
                        const checkPath =
                          attemptId != null
                            ? studentAttemptCheckPath(
                                numericQuizId,
                                attemptId,
                                "assigned",
                              )
                            : null;
                        const canScore = hasAttemptScoreAccess(assignment.canScore);

                        if (!checkPath) {
                          return <span className="text-slate-400">—</span>;
                        }

                        return (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant={
                                canScore && !assignment.isReviewDone
                                  ? "default"
                                  : "outline"
                              }
                              className="h-7 rounded-full px-2.5 text-[11px] font-semibold leading-none"
                              asChild
                            >
                              <Link to={checkPath}>
                                {attemptReviewActionLabel(
                                  canScore,
                                  assignment.isReviewDone,
                                )}
                              </Link>
                            </Button>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-slate-600">
            No {assignedPeopleLabel.toLowerCase()} yet.
          </p>
        )}
      </div>
    </div>
  );
}
