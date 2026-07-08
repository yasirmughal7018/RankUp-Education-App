import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import {
  canAiApproveQuestions,
  canApproveQuestions,
  isApprovedQuestionStatus,
  isPendingQuestionStatus,
} from "@/features/questions/domain/questionTypes";
import {
  getQuestionStatusTone,
  StatusBadge,
} from "@/features/questions/presentation/components/StatusBadge";
import {
  useActivateQuestionMutation,
  useApproveQuestionAiMutation,
  useApproveQuestionMutation,
  useDeactivateQuestionMutation,
  useDeleteQuestionMutation,
  useQuestionQuery,
  useRejectQuestionMutation,
} from "@/features/questions/presentation/hooks/useQuestionQueries";

export function QuestionDetailPage() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const numericQuestionId = Number(questionId);

  const { data: question, isLoading, error } = useQuestionQuery(numericQuestionId);
  const approveQuestion = useApproveQuestionMutation(numericQuestionId);
  const approveQuestionAi = useApproveQuestionAiMutation(numericQuestionId);
  const rejectQuestion = useRejectQuestionMutation(numericQuestionId);
  const activateQuestion = useActivateQuestionMutation(numericQuestionId);
  const deactivateQuestion = useDeactivateQuestionMutation(numericQuestionId);
  const deleteQuestion = useDeleteQuestionMutation();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const canApprove = user ? canApproveQuestions(user.role) : false;
  const canAiApprove = user ? canAiApproveQuestions(user.role) : false;

  const isSubmitting =
    approveQuestion.isPending ||
    approveQuestionAi.isPending ||
    rejectQuestion.isPending ||
    activateQuestion.isPending ||
    deactivateQuestion.isPending ||
    deleteQuestion.isPending;

  async function runAction(action: () => Promise<unknown>, success: string) {
    setActionError(null);
    setSuccessMessage(null);

    try {
      await action();
      setSuccessMessage(success);
    } catch (caught) {
      const apiError = caught as { message?: string };
      setActionError(apiError.message || "Action failed.");
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-slate-600 sm:px-6">
        Loading question...
      </div>
    );
  }

  if (!question) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <PageHeader
          title="Question not found"
          description={error?.message ?? "Unable to load question."}
        />
        <Link
          to="/questions"
          className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
        >
          Back to question bank
        </Link>
      </div>
    );
  }

  const isPending = isPendingQuestionStatus(question.status);
  const isApproved = isApprovedQuestionStatus(question.status);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        title={`Question #${question.questionId}`}
        description={question.questionType}
        action={
          <Link
            to={`/questions/${question.questionId}/edit`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Edit
          </Link>
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

      <section className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            label={question.status}
            tone={getQuestionStatusTone(question.status, question.isActive)}
          />
          <StatusBadge
            label={question.isActive ? "Active" : "Inactive"}
            tone={question.isActive ? "success" : "default"}
          />
          {question.isAiApproved ? (
            <StatusBadge label="AI approved" tone="success" />
          ) : null}
        </div>

        <p className="text-base leading-7 text-slate-900">{question.questionText}</p>

        <div className="grid gap-4 text-sm text-slate-700 md:grid-cols-2">
          <p>Class ID: {question.classId}</p>
          <p>Subject ID: {question.subjectId}</p>
          <p>Topic ID: {question.topicId ?? "—"}</p>
          <p>Difficulty: {question.difficultyLevel}</p>
          <p>Marks: {question.marks}</p>
          <p>Time: {question.estimatedTimeSeconds}s</p>
          <p>Created by: {question.createdBy}</p>
          <p>Approved by: {question.approvedBy ?? "—"}</p>
        </div>

        {question.hint ? (
          <div>
            <h3 className="text-sm font-medium text-slate-900">Hint</h3>
            <p className="mt-1 text-sm text-slate-600">{question.hint}</p>
          </div>
        ) : null}

        {question.explanation ? (
          <div>
            <h3 className="text-sm font-medium text-slate-900">Explanation</h3>
            <p className="mt-1 text-sm text-slate-600">{question.explanation}</p>
          </div>
        ) : null}

        {question.options.length > 0 ? (
          <div>
            <h3 className="mb-3 text-sm font-medium text-slate-900">Options</h3>
            <ul className="space-y-2">
              {question.options.map((option) => (
                <li
                  key={option.optionId}
                  className="rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700"
                >
                  {option.optionText}
                  {option.isCorrect ? (
                    <span className="ml-2 text-xs font-medium text-emerald-700">
                      Correct
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="flex flex-wrap gap-2">
        {canApprove && isPending ? (
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() =>
                void runAction(
                  () => approveQuestion.mutateAsync(),
                  "Question approved.",
                )
              }
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
            >
              Approve
            </button>
            {canAiApprove ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  void runAction(
                    () => approveQuestionAi.mutateAsync(),
                    "Question AI-approved.",
                  )
                }
                className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-50 disabled:opacity-70"
              >
                AI approve
              </button>
            ) : null}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setShowRejectReason(true);
                setRejectReason("");
                setActionError(null);
                setSuccessMessage(null);
              }}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-70"
            >
              Reject
            </button>
          </>
        ) : null}

        {canApprove && isPending && showRejectReason ? (
          <div className="w-full rounded-xl border border-red-200 bg-red-50/60 p-4">
            <label
              htmlFor="rejectReason"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Rejection reason (optional)
            </label>
            <textarea
              id="rejectReason"
              rows={3}
              value={rejectReason}
              disabled={isSubmitting}
              onChange={(event) => setRejectReason(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2"
              placeholder="Explain why this question is being rejected..."
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  void runAction(async () => {
                    await rejectQuestion.mutateAsync(
                      rejectReason.trim() || undefined,
                    );
                    setShowRejectReason(false);
                    setRejectReason("");
                  }, "Question rejected.")
                }
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-70"
              >
                Confirm reject
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setShowRejectReason(false);
                  setRejectReason("");
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {isApproved && !question.isActive ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() =>
              void runAction(
                () => activateQuestion.mutateAsync(),
                "Question activated.",
              )
            }
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
          >
            Activate
          </button>
        ) : null}

        {question.isActive ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() =>
              void runAction(
                () => deactivateQuestion.mutateAsync(),
                "Question deactivated.",
              )
            }
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
          >
            Deactivate
          </button>
        ) : null}

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => {
            const confirmed = window.confirm("Delete this question?");
            if (!confirmed) {
              return;
            }

            void (async () => {
              setActionError(null);
              try {
                await deleteQuestion.mutateAsync(question.questionId);
                navigate("/questions");
              } catch (caught) {
                const apiError = caught as { message?: string };
                setActionError(apiError.message || "Unable to delete question.");
              }
            })();
          }}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-70"
        >
          Delete
        </button>
      </section>
    </div>
  );
}
