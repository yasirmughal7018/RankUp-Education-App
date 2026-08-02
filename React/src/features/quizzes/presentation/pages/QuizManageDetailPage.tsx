import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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

  const {
    data: quiz,
    isLoading,
    error,
    isSuccess: quizLoaded,
  } = useManageQuizQuery(numericQuizId);
  const { data: assignments = [] } = useQuizAssignmentsQuery(
    numericQuizId,
    quizLoaded,
  );

  const publishQuiz = usePublishQuizMutation(numericQuizId);
  const deleteQuiz = useDeleteQuizMutation(numericQuizId);
  const duplicateQuiz = useDuplicateQuizMutation(numericQuizId);
  const archiveQuiz = useArchiveQuizMutation(numericQuizId);
  const removeQuestion = useRemoveQuizQuestionMutation(numericQuizId);
  const attachBankQuestion = useAttachBankQuestionMutation(numericQuizId);
  const assignQuiz = useAssignQuizMutation(numericQuizId);
  const cancelAssignments = useCancelQuizAssignmentsMutation(numericQuizId);
  const allowRetry = useAllowRetryMutation(numericQuizId);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  const isSubmitting =
    publishQuiz.isPending ||
    deleteQuiz.isPending ||
    duplicateQuiz.isPending ||
    archiveQuiz.isPending ||
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

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-slate-600 sm:px-6">
        Loading quiz...
      </div>
    );
  }

  if (!quiz) {
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
  const published =
    quiz.lifecycleStatus.toLowerCase() === "published" ||
    quiz.lifecycleStatus.toLowerCase() === "assigned";
  const approvalRejected =
    quiz.approvalStatus.trim().toLowerCase() === "rejected" ||
    quiz.approvalStatus.trim().toLowerCase() === "declined";
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
            This quiz was rejected. Edit if needed, then resubmit for approval.
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
              onClick={() =>
                void runAction(async () => {
                  await deleteQuiz.mutateAsync();
                  navigate("/quizzes");
                }, "")
              }
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
                          navigate("/quizzes");
                          return;
                        }
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

      {showBankDialog ? (
        <AttachBankQuestionsDialog
          classId={quiz.classId}
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
