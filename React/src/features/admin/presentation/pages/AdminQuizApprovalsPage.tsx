import { useState } from "react";
import { PageHeader } from "@/core/components/PageHeader";
import type { PendingQuizApproval } from "@/features/quizzes/domain/quizTypes";
import {
  getQuestionStatusTone,
  StatusBadge,
} from "@/features/questions/presentation/components/StatusBadge";
import {
  useApproveQuizMutation,
  usePendingQuizApprovalsQuery,
  useRejectQuizMutation,
} from "@/features/quizzes/presentation/hooks/useQuizQueries";

/** Admin queue to approve or reject teacher quizzes pending school review. */
export function AdminQuizApprovalsPage() {
  const { data: quizzes = [], isLoading, error, refetch, isFetching } =
    usePendingQuizApprovalsQuery();
  const approveQuiz = useApproveQuizMutation();
  const rejectQuiz = useRejectQuizMutation();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectingQuizId, setRejectingQuizId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const isSubmitting = approveQuiz.isPending || rejectQuiz.isPending;

  async function handleApprove(quiz: PendingQuizApproval) {
    setActionError(null);
    setSuccessMessage(null);

    try {
      await approveQuiz.mutateAsync(quiz.quizId);
      setSuccessMessage(`"${quiz.title}" approved.`);
    } catch (caught) {
      const apiError = caught as { message?: string };
      setActionError(apiError.message || "Unable to approve quiz.");
    }
  }

  async function handleReject(quiz: PendingQuizApproval) {
    setActionError(null);
    setSuccessMessage(null);

    try {
      await rejectQuiz.mutateAsync({
        quizId: quiz.quizId,
        reason: rejectReason.trim() || undefined,
      });
      setSuccessMessage(`"${quiz.title}" rejected.`);
      setRejectingQuizId(null);
      setRejectReason("");
    } catch (caught) {
      const apiError = caught as { message?: string };
      setActionError(apiError.message || "Unable to reject quiz.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Quiz approvals"
        description="Review and approve teacher quizzes submitted for school approval."
        action={
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching || isSubmitting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
          >
            Refresh
          </button>
        }
      />

      {successMessage ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      {error || actionError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError ?? error?.message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            Loading quizzes...
          </div>
        ) : quizzes.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            No quizzes pending approval.
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
                    Created by
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    School
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {quizzes.map((quiz) => (
                  <tr key={quiz.quizId} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{quiz.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {quiz.subjectName} · {quiz.gradeName} ·{" "}
                        {quiz.totalQuestions} questions
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{quiz.createdBy}</td>
                    <td className="px-4 py-3 text-slate-700">{quiz.schoolName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={quiz.approvalStatus || quiz.lifecycleStatus}
                        tone={getQuestionStatusTone(
                          quiz.approvalStatus || quiz.lifecycleStatus,
                          true,
                        )}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {rejectingQuizId === quiz.quizId ? (
                        <div className="ml-auto flex max-w-xs flex-col items-stretch gap-2">
                          <input
                            type="text"
                            value={rejectReason}
                            disabled={isSubmitting}
                            onChange={(event) =>
                              setRejectReason(event.target.value)
                            }
                            placeholder="Optional reason"
                            className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => {
                                setRejectingQuizId(null);
                                setRejectReason("");
                              }}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => void handleReject(quiz)}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-70"
                            >
                              Confirm reject
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => void handleApprove(quiz)}
                            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => {
                              setRejectingQuizId(quiz.quizId);
                              setRejectReason("");
                            }}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-70"
                          >
                            Reject
                          </button>
                        </div>
                      )}
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
