import { useState } from "react";
import { PageHeader } from "@/core/components/PageHeader";
import type { QuizSummary } from "@/features/quizzes/domain/quizTypes";
import {
  getQuestionStatusTone,
  StatusBadge,
} from "@/features/questions/presentation/components/StatusBadge";
import {
  useApproveQuizMutation,
  useQuizzesQuery,
} from "@/features/quizzes/presentation/hooks/useQuizQueries";

export function AdminQuizApprovalsPage() {
  const { data: quizzes = [], isLoading, error, refetch, isFetching } =
    useQuizzesQuery();
  const approveQuiz = useApproveQuizMutation();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleApprove(quiz: QuizSummary) {
    setActionError(null);
    setSuccessMessage(null);

    try {
      await approveQuiz.mutateAsync(quiz.id);
      setSuccessMessage(`"${quiz.title}" approved.`);
    } catch (caught) {
      const apiError = caught as { message?: string };
      setActionError(apiError.message || "Unable to approve quiz.");
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
            disabled={isFetching || approveQuiz.isPending}
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
            No quizzes found for approval.
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
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {quizzes.map((quiz) => (
                  <tr key={quiz.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {quiz.title}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{quiz.createdBy}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={quiz.status}
                        tone={getQuestionStatusTone(quiz.status, true)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={approveQuiz.isPending}
                        onClick={() => void handleApprove(quiz)}
                        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
                      >
                        Approve
                      </button>
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
