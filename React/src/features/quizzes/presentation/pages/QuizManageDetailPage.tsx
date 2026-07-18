import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { AddQuizQuestionDialog } from "@/features/quizzes/presentation/components/AddQuizQuestionDialog";
import { AssignQuizDialog } from "@/features/quizzes/presentation/components/AssignQuizDialog";
import {
  isDraftQuiz,
  type QuizQuestionItem,
} from "@/features/quizzes/domain/quizTypes";
import {
  getQuestionStatusTone,
  StatusBadge,
} from "@/features/questions/presentation/components/StatusBadge";
import {
  useAddQuizQuestionMutation,
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
  useUpdateQuizQuestionMutation,
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

export function QuizManageDetailPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const numericQuizId = Number(quizId);

  const {
    data: quiz,
    isLoading,
    error,
  } = useManageQuizQuery(numericQuizId);
  const { data: assignments = [] } = useQuizAssignmentsQuery(numericQuizId);

  const publishQuiz = usePublishQuizMutation(numericQuizId);
  const deleteQuiz = useDeleteQuizMutation(numericQuizId);
  const duplicateQuiz = useDuplicateQuizMutation(numericQuizId);
  const archiveQuiz = useArchiveQuizMutation(numericQuizId);
  const removeQuestion = useRemoveQuizQuestionMutation(numericQuizId);
  const addQuestion = useAddQuizQuestionMutation(numericQuizId);
  const updateQuestion = useUpdateQuizQuestionMutation(numericQuizId);
  const attachBankQuestion = useAttachBankQuestionMutation(numericQuizId);
  const assignQuiz = useAssignQuizMutation(numericQuizId);
  const cancelAssignments = useCancelQuizAssignmentsMutation(numericQuizId);
  const allowRetry = useAllowRetryMutation(numericQuizId);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestionItem | null>(
    null,
  );
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  const isSubmitting =
    publishQuiz.isPending ||
    deleteQuiz.isPending ||
    duplicateQuiz.isPending ||
    archiveQuiz.isPending ||
    removeQuestion.isPending ||
    addQuestion.isPending ||
    updateQuestion.isPending ||
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

  function openAddQuestion() {
    setEditingQuestion(null);
    setShowQuestionDialog(true);
  }

  function openEditQuestion(question: QuizQuestionItem) {
    setEditingQuestion(question);
    setShowQuestionDialog(true);
  }

  function closeQuestionDialog() {
    setShowQuestionDialog(false);
    setEditingQuestion(null);
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
        />
        <Link
          to="/quizzes"
          className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
        >
          Back to quizzes
        </Link>
      </div>
    );
  }

  const draft = isDraftQuiz(quiz.lifecycleStatus);
  const published =
    quiz.lifecycleStatus.toLowerCase() === "published" ||
    quiz.lifecycleStatus.toLowerCase() === "assigned";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader
        title={quiz.title}
        description={`${quiz.subject} · ${quiz.grade} · ${quiz.lifecycleStatus}`}
        action={
          <div className="flex gap-2">
            {!draft ? (
              <Link
                to={`/quizzes/${quiz.id}/monitoring`}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Monitor
              </Link>
            ) : null}
            <Link
              to={`/quizzes/${quiz.id}/edit`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Edit settings
            </Link>
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
            {quiz.questionCount}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total marks</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {quiz.totalMarks}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Time limit</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {quiz.timeLimitMinutes ?? "—"} min
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
          <StatusBadge label={quiz.quizType} />
        </div>

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
        {draft ? (
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={openAddQuestion}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
            >
              Add question
            </button>
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
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() =>
                void runAction(async () => {
                  const duplicated = await duplicateQuiz.mutateAsync();
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
              onClick={() =>
                void runAction(() => archiveQuiz.mutateAsync(), "Quiz archived.")
              }
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
            >
              Archive
            </button>
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
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Questions</h2>
        </div>

        {quiz.questions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-600">
            No questions added yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {quiz.questions.map((question) => (
              <article key={question.questionId} className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {question.displayOrder}. {question.questionText}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {question.questionType} · {question.marks} marks
                    </p>
                  </div>

                  {draft ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => openEditQuestion(question)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() =>
                          void runAction(
                            () => removeQuestion.mutateAsync(question.questionId),
                            "Question removed.",
                          )
                        }
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-70"
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
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

      {showQuestionDialog ? (
        <AddQuizQuestionDialog
          initialQuestion={editingQuestion}
          classId={quiz.classId}
          subjectId={quiz.subjectId}
          excludeQuestionIds={quiz.questions.map((item) => item.questionId)}
          title={editingQuestion ? "Edit quiz question" : undefined}
          submitLabel={editingQuestion ? "Save changes" : undefined}
          isSubmitting={
            addQuestion.isPending ||
            updateQuestion.isPending ||
            attachBankQuestion.isPending
          }
          onClose={closeQuestionDialog}
          onSubmit={async (input) => {
            setActionError(null);
            try {
              if (editingQuestion) {
                await updateQuestion.mutateAsync({
                  questionId: editingQuestion.questionId,
                  input,
                });
                setSuccessMessage("Question updated.");
              } else {
                await addQuestion.mutateAsync(input);
                setSuccessMessage("Question added to quiz.");
              }
              closeQuestionDialog();
            } catch (caught) {
              const apiError = caught as { message?: string };
              setActionError(
                apiError.message ||
                  (editingQuestion
                    ? "Unable to update question."
                    : "Unable to add question."),
              );
              throw caught;
            }
          }}
          onAttachFromBank={
            editingQuestion
              ? undefined
              : async (input) => {
                  setActionError(null);
                  try {
                    await attachBankQuestion.mutateAsync(input);
                    closeQuestionDialog();
                    setSuccessMessage("Question attached from bank.");
                  } catch (caught) {
                    const apiError = caught as { message?: string };
                    setActionError(
                      apiError.message || "Unable to attach bank question.",
                    );
                    throw caught;
                  }
                }
          }
        />
      ) : null}

      {showAssignDialog ? (
        <AssignQuizDialog
          isSubmitting={assignQuiz.isPending}
          defaultGrade={quiz.grade}
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
