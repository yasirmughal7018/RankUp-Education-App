import { useState } from "react";
import { flushSync } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/core/components/PageHeader";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import { AttachBankQuestionsDialog } from "@/features/quizzes/presentation/components/AttachBankQuestionsDialog";
import { AssignQuizDialog } from "@/features/quizzes/presentation/components/AssignQuizDialog";
import {
  answersFromQuizQuestion,
  QuizQuestionAnswerAside,
} from "@/features/quizzes/presentation/components/QuizQuestionAnswerAside";
import {
  canAuthorQuizzes,
  formatQuizDuration,
  isDraftQuiz,
  isQuizMetadataEditable,
  isRejectedQuizApprovalStatus,
  isSchoolApprovedQuizStatus,
  sumQuizEstimatedSeconds,
  sumQuizMarks,
} from "@/features/quizzes/domain/quizTypes";
import {
  getQuestionStatusTone,
  StatusBadge,
} from "@/features/questions/presentation/components/StatusBadge";
import {
  useAllowRetryMutation,
  useArchiveQuizMutation,
  useUnarchiveQuizMutation,
  useAssignQuizMutation,
  useAttachBankQuestionMutation,
  useCancelQuizAssignmentsMutation,
  useDeleteQuizMutation,
  useDuplicateQuizMutation,
  useManageQuizQuery,
  usePublishQuizMutation,
  useQuizAssignmentsQuery,
  useRemoveQuizQuestionMutation,
} from "@/features/quizzes/presentation/hooks/useQuizQueries";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const HISTORY_ACTION_LABELS: Record<string, string> = {
  Created: "Created",
  SubmittedForReview: "Submitted for review",
  Endorsed: "Endorsed",
  Approved: "Approved",
  Published: "Published",
  Rejected: "Rejected",
  Activated: "Activated",
  Deactivated: "Deactivated",
  Archived: "Archived",
  Unarchived: "Unarchived",
  Modified: "Modified",
};

function historyDotClass(action: string): string {
  switch (action) {
    case "Published":
    case "Approved":
    case "Activated":
    case "Unarchived":
      return "border-[var(--status-approved-border)] bg-[var(--status-approved-bg)]";
    case "Endorsed":
    case "SubmittedForReview":
      return "border-[var(--status-pending-border)] bg-[var(--status-pending-bg)]";
    case "Rejected":
      return "border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)]";
    case "Modified":
    case "Created":
      return "border-primary/40 bg-primary/10";
    default:
      return "border-border bg-muted";
  }
}

function historyChipClass(action: string): string {
  switch (action) {
    case "Published":
    case "Approved":
    case "Activated":
    case "Unarchived":
      return "border-[var(--status-approved-border)] bg-[var(--status-approved-bg)] text-[var(--status-approved-text)]";
    case "Endorsed":
    case "SubmittedForReview":
      return "border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]";
    case "Rejected":
      return "border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)] text-[var(--status-rejected-text)]";
    case "Modified":
    case "Created":
      return "border-primary/30 bg-primary/5 text-primary";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

/** "CampusAdmin" → "Campus Admin". */
function humanizeRole(role: string): string {
  return role.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function formatHistoryDate(occurredAt: string): string {
  const date = new Date(occurredAt);
  return Number.isNaN(date.getTime())
    ? occurredAt
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function canAllowRetry(assignment: {
  isReviewDone: boolean;
  attemptCount: number;
  allowedAttempts: number;
}): boolean {
  return (
    assignment.isReviewDone &&
    assignment.attemptCount >= assignment.allowedAttempts
  );
}

/** Quiz manage hub: questions, assignments, publish/archive, and lifecycle actions. */
export function QuizManageDetailPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canAuthor = user != null && canAuthorQuizzes(user.role);
  const numericQuizId = Number(quizId);

  // When true, stop manage/assignments queries so hard-delete cannot trigger a
  // second GetManageDetail (RequireOwnedQuizAsync) after the quiz row is gone.
  const [suppressDetailQueries, setSuppressDetailQueries] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [approvalHistoryExpanded, setApprovalHistoryExpanded] = useState(false);

  const publishQuiz = usePublishQuizMutation(numericQuizId);
  const deleteQuiz = useDeleteQuizMutation(numericQuizId);
  const duplicateQuiz = useDuplicateQuizMutation(numericQuizId);
  const archiveQuiz = useArchiveQuizMutation(numericQuizId);
  const unarchiveQuiz = useUnarchiveQuizMutation(numericQuizId);
  const removeQuestion = useRemoveQuizQuestionMutation(numericQuizId);
  const attachBankQuestion = useAttachBankQuestionMutation(numericQuizId);
  const assignQuiz = useAssignQuizMutation(numericQuizId);
  const cancelAssignments = useCancelQuizAssignmentsMutation(numericQuizId);
  const allowRetry = useAllowRetryMutation(numericQuizId);

  const detailQueriesEnabled =
    !suppressDetailQueries && !deleteQuiz.isPending;

  const {
    data: quiz,
    isLoading,
    error,
    isSuccess: quizLoaded,
  } = useManageQuizQuery(numericQuizId, detailQueriesEnabled);

  const { data: assignments = [] } = useQuizAssignmentsQuery(
    numericQuizId,
    detailQueriesEnabled && quizLoaded,
  );

  const isSubmitting =
    publishQuiz.isPending ||
    deleteQuiz.isPending ||
    duplicateQuiz.isPending ||
    archiveQuiz.isPending ||
    unarchiveQuiz.isPending ||
    removeQuestion.isPending ||
    attachBankQuestion.isPending ||
    assignQuiz.isPending ||
    cancelAssignments.isPending ||
    allowRetry.isPending;

  async function runAction(action: () => Promise<unknown>, success: string) {
    setActionError(null);
    setSuccessMessage(null);

    try {
      await action();
      if (success) {
        setSuccessMessage(success);
      }
    } catch (caught) {
      const apiError = caught as { message?: string };
      setActionError(apiError.message || "Action failed.");
    }
  }

  function openBankDialog() {
    setShowBankDialog(true);
  }

  if (isLoading && !suppressDetailQueries) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-slate-600 sm:px-6">
        Loading quiz...
      </div>
    );
  }

  if (!quiz) {
    if (suppressDetailQueries) {
      return (
        <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-slate-600 sm:px-6">
          Closing quiz...
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <PageHeader
          title="Quiz not found"
          description={error?.message ?? "Unable to load quiz."}
          backTo="/quizzes"
          backAriaLabel="Back to quizzes"
        />
      </div>
    );
  }

  const draft = isDraftQuiz(quiz.lifecycleStatus);
  const archived = quiz.lifecycleStatus.trim().toLowerCase() === "archived";
  const published =
    quiz.lifecycleStatus.toLowerCase() === "published" ||
    quiz.lifecycleStatus.toLowerCase() === "assigned";
  const approvalRejected = isRejectedQuizApprovalStatus(quiz.approvalStatus);
  const schoolApproved = isSchoolApprovedQuizStatus(quiz.approvalStatus);
  const settingsEditable =
    canAuthor &&
    isQuizMetadataEditable(quiz.lifecycleStatus, assignments);
  const questionsEditable = settingsEditable;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader
        title={quiz.title}
        description={`${quiz.subject} · ${quiz.grade} · ${quiz.lifecycleStatus}`}
        backTo="/quizzes"
        backAriaLabel="Back to quizzes"
        action={
          <div className="flex gap-2">
            {!draft ? (
              <Link
                to={`/quizzes/${numericQuizId}/monitoring`}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Monitor
              </Link>
            ) : null}
            {settingsEditable ? (
              <Link
                to={`/quizzes/${numericQuizId}/edit`}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Edit settings
              </Link>
            ) : null}
          </div>
        }
      />

      {successMessage ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      {actionError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Questions</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {quiz.questions.length > 0
              ? quiz.questions.length
              : quiz.questionCount}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total marks</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {quiz.questions.length > 0
              ? sumQuizMarks(quiz.questions)
              : quiz.totalMarks}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total time</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {quiz.questions.length > 0
              ? formatQuizDuration(sumQuizEstimatedSeconds(quiz.questions))
              : quiz.timeLimitMinutes != null
                ? `${quiz.timeLimitMinutes} min`
                : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Assignments</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {assignments.length}
          </p>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <StatusBadge
            label={quiz.lifecycleStatus}
            tone={getQuestionStatusTone(quiz.lifecycleStatus, true)}
          />
          <StatusBadge
            label={quiz.approvalStatus}
            tone={getQuestionStatusTone(quiz.approvalStatus, true)}
          />
          <StatusBadge label={quiz.quizType} />
        </div>

        {approvalRejected && quiz.rejectionReason ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Rejected: {quiz.rejectionReason}
          </div>
        ) : approvalRejected ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            This quiz was rejected and cannot be approved until you resubmit it.
          </div>
        ) : schoolApproved ? (
          <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            School-approved — waiting for portal admin final approval before
            assignment.
          </div>
        ) : null}

        <p className="text-sm leading-6 text-slate-700">{quiz.description}</p>

        <div className="mt-4">
          <h3 className="text-sm font-medium text-slate-900">Instructions</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            {quiz.instructions.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mb-6 flex flex-wrap gap-2">
        {questionsEditable ? (
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={openBankDialog}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
            >
              Add from bank
            </button>
            {draft ? (
              <>
            <button
              type="button"
              disabled={isSubmitting || quiz.questionCount === 0}
              onClick={() =>
                void runAction(() => publishQuiz.mutateAsync(), "Quiz published.")
              }
              className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-50 disabled:opacity-70"
            >
              Publish
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                void (async () => {
                  setActionError(null);
                  setSuccessMessage(null);
                  flushSync(() => setSuppressDetailQueries(true));
                  try {
                    await deleteQuiz.mutateAsync();
                    navigate("/quizzes");
                  } catch (caught) {
                    setSuppressDetailQueries(false);
                    const apiError = caught as { message?: string };
                    setActionError(apiError.message || "Action failed.");
                  }
                })();
              }}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-70"
            >
              Delete
            </button>
              </>
            ) : null}
            {approvalRejected && canAuthor ? (
              <button
                type="button"
                disabled={isSubmitting || quiz.questionCount === 0}
                onClick={() =>
                  void runAction(
                    () => publishQuiz.mutateAsync(),
                    "Resubmitted for approval.",
                  )
                }
                className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-50 disabled:opacity-70"
              >
                Resubmit for approval
              </button>
            ) : null}
          </>
        ) : null}

        {archived && canAuthor ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() =>
              void runAction(() => unarchiveQuiz.mutateAsync(), "Quiz unarchived.")
            }
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
          >
            Unarchive
          </button>
        ) : null}

        {published ? (
          <>
            <button
              type="button"
              disabled={isSubmitting || quiz.questionCount === 0}
              onClick={() => setShowAssignDialog(true)}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
            >
              Assign
            </button>
            {canAuthor ? (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() =>
                    void runAction(async () => {
                      const duplicated = await duplicateQuiz.mutateAsync();
                      if (!duplicated?.id) {
                        throw new Error(
                          "Quiz was duplicated but the new quiz id was missing.",
                        );
                      }
                      navigate(`/quizzes/${duplicated.id}`);
                    }, "Quiz duplicated.")
                  }
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    void (async () => {
                      setActionError(null);
                      setSuccessMessage(null);
                      try {
                        const result = await archiveQuiz.mutateAsync();
                        if (result.permanentlyDeleted) {
                          // Hard-delete only: stop manage refetch, then leave the page.
                          flushSync(() => setSuppressDetailQueries(true));
                          navigate("/quizzes");
                          return;
                        }
                        // Soft archive: mutation already invalidated manage for latest status.
                        setSuccessMessage("Quiz archived.");
                      } catch (caught) {
                        const apiError = caught as { message?: string };
                        setActionError(apiError.message || "Action failed.");
                      }
                    })();
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                >
                  Archive
                </button>
              </>
            ) : null}
            {assignments.length > 0 ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  const confirmed = window.confirm(
                    "Cancel upcoming assignments for this quiz?",
                  );
                  if (!confirmed) {
                    return;
                  }

                  void runAction(
                    () => cancelAssignments.mutateAsync(),
                    "Upcoming assignments cancelled.",
                  );
                }}
                className="rounded-lg border border-amber-200 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-50 disabled:opacity-70"
              >
                Cancel assignments
              </button>
            ) : null}
          </>
        ) : null}
      </section>

      <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <p className="text-sm font-medium text-slate-900">
            {quiz.questions.length} question
            {quiz.questions.length === 1 ? "" : "s"}
          </p>
        </div>

        {quiz.questions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-600 sm:px-5">
            No questions added yet.
          </div>
        ) : (
          <div>
            <div className="hidden border-b border-slate-200 bg-slate-50 px-4 py-2.5 sm:grid sm:grid-cols-7 sm:gap-3 sm:px-5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Subject
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Class
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Difficulty
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Type
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Marks
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Time sec
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Actions
              </p>
            </div>

            <ul className="divide-y divide-slate-200">
              {quiz.questions.map((question) => {
                const timeLabel =
                  question.estimatedTimeSeconds > 0
                    ? `${question.estimatedTimeSeconds} sec`
                    : "—";
                const questionLine = `${question.displayOrder}. ${question.questionText}`;
                const answers = answersFromQuizQuestion(question);

                return (
                  <li key={question.questionId} className="px-4 py-3.5 sm:px-5">
                    <div className="flex items-start gap-3">
                      <p
                        className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900"
                        title={questionLine}
                      >
                        {questionLine}
                      </p>
                      <QuizQuestionAnswerAside
                        questionType={question.questionType}
                        answers={answers}
                      />
                    </div>

                    <div className="mt-2 grid grid-cols-2 items-center gap-x-3 gap-y-1.5 text-xs text-slate-500 sm:grid-cols-7">
                      <p className="min-w-0 truncate font-medium text-slate-900">
                        {quiz.subject}
                      </p>
                      <p className="min-w-0 truncate">{quiz.grade}</p>
                      <p className="min-w-0 truncate">{quiz.difficulty}</p>
                      <p className="min-w-0 truncate">{question.questionType}</p>
                      <p className="min-w-0 truncate tabular-nums sm:hidden">
                        {question.marks} / {timeLabel}
                      </p>
                      <p className="hidden min-w-0 truncate tabular-nums sm:block">
                        {question.marks}
                      </p>
                      <p className="hidden min-w-0 truncate tabular-nums sm:block">
                        {timeLabel}
                      </p>
                      <div className="col-span-2 flex min-w-0 flex-wrap gap-2 sm:col-span-1">
                        {questionsEditable ? (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() =>
                              void runAction(
                                () =>
                                  removeQuestion.mutateAsync(
                                    question.questionId,
                                  ),
                                "Question removed.",
                              )
                            }
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-70"
                          >
                            Remove
                          </button>
                        ) : (
                          <span className="hidden text-xs text-slate-400 sm:inline">
                            —
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {assignments.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Assignments</h2>
          </div>
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
                    Attempts
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
                  <tr key={assignment.assignmentId}>
                    <td className="px-4 py-3 text-slate-700">
                      {assignment.studentName?.trim() || assignment.studentId}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDateTime(assignment.startAt)} -{" "}
                      {formatDateTime(assignment.endAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {assignment.attemptCount}/{assignment.allowedAttempts}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {assignment.resultStatus}
                      {assignment.isReviewDone ? (
                        <span className="ml-2 text-xs text-emerald-700">
                          Reviewed
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canAllowRetry(assignment) ? (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() =>
                            void runAction(
                              () =>
                                allowRetry.mutateAsync({
                                  assignmentId: assignment.assignmentId,
                                }),
                              "Extra attempt allowed.",
                            )
                          }
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                        >
                          Allow retry
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <button
          type="button"
          aria-expanded={approvalHistoryExpanded}
          onClick={() => setApprovalHistoryExpanded((open) => !open)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">
              Approval history
              {(quiz.approvalHistory?.length ?? 0) > 0 ? (
                <span className="ml-2 font-normal text-muted-foreground">
                  ({quiz.approvalHistory!.length})
                </span>
              ) : null}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Full trail for every role — create, endorse/publish, modify, activate,
              deactivate, archive, and unarchive.
            </p>
          </div>
          <ChevronDown
            aria-hidden
            className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
              approvalHistoryExpanded ? "rotate-180" : ""
            }`}
          />
        </button>

        {approvalHistoryExpanded ? (
          <div className="mt-4">
            {(quiz.approvalHistory?.length ?? 0) === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-muted/40 px-3.5 py-3 text-sm text-muted-foreground">
                No history recorded yet. New actions will appear here for Teacher,
                Campus Admin, School Admin, and Portal Admin.
              </p>
            ) : (
              <ol className="relative space-y-3 border-l border-border pl-5">
                {quiz.approvalHistory!.map((entry) => (
                  <li key={entry.approvalId} className="relative">
                    <span
                      aria-hidden
                      className={`absolute -left-[1.6rem] top-3 h-3 w-3 rounded-full border-2 ${historyDotClass(entry.action)}`}
                    />
                    <div className="rounded-xl border border-border bg-background px-3.5 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {entry.actorName}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {humanizeRole(entry.actorRole)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatHistoryDate(entry.occurredAt)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex shrink-0 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-semibold ${historyChipClass(entry.action)}`}
                        >
                          {HISTORY_ACTION_LABELS[entry.action] ?? entry.action}
                        </span>
                      </div>
                      {entry.reason ? (
                        <p className="mt-2 rounded-lg border border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)]/60 px-3 py-2 text-xs text-[var(--status-rejected-text)]">
                          {entry.reason}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : null}
      </section>

      {showBankDialog ? (
        <AttachBankQuestionsDialog
          subjectId={quiz.subjectId}
          excludeQuestionIds={quiz.questions.map((item) => item.questionId)}
          isSubmitting={attachBankQuestion.isPending}
          onClose={() => setShowBankDialog(false)}
          onAttach={async (inputs) => {
            setActionError(null);
            try {
              for (const input of inputs) {
                await attachBankQuestion.mutateAsync(input);
              }
              setShowBankDialog(false);
              setSuccessMessage(
                inputs.length === 1
                  ? "Question attached from bank."
                  : `${inputs.length} questions attached from bank.`,
              );
            } catch (caught) {
              const apiError = caught as { message?: string };
              setActionError(
                apiError.message || "Unable to attach bank questions.",
              );
              throw caught;
            }
          }}
        />
      ) : null}

      {showAssignDialog ? (
        <AssignQuizDialog
          isSubmitting={assignQuiz.isPending}
          defaultGrade={quiz.grade}
          quizType={quiz.quizType}
          onClose={() => setShowAssignDialog(false)}
          onSubmit={async (input) => {
            setActionError(null);
            try {
              await assignQuiz.mutateAsync(input);
              setShowAssignDialog(false);
              setSuccessMessage("Quiz assigned successfully.");
            } catch (caught) {
              const apiError = caught as { message?: string };
              setActionError(apiError.message || "Unable to assign quiz.");
              throw caught;
            }
          }}
        />
      ) : null}
    </div>
  );
}
