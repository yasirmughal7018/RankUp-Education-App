import { Link } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { usePendingQuizApprovalsQuery } from "@/features/quizzes/presentation/hooks/useQuizQueries";
import {
  getQuestionStatusTone,
  StatusBadge,
} from "@/features/questions/presentation/components/StatusBadge";

/**
 * Legacy route — approvals are handled on each quiz's manage detail page (/quizzes/:id).
 * Lists pending quizzes as links into that review flow.
 */
export function AdminQuizApprovalsPage() {
  const { data: quizzes = [], isLoading, error } = usePendingQuizApprovalsQuery();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Quizzes awaiting approval"
        description="Open a quiz to review its details and approve or reject. Approval actions are on the quiz page — not here."
        backTo="/quizzes"
        backAriaLabel="Back to quizzes"
      />

      <div className="mb-4 rounded-lg border border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] px-4 py-3 text-sm text-[var(--status-pending-text)]">
        Go to <Link to="/quizzes" className="font-medium underline">Quizzes</Link>, open a
        quiz with status <strong>Approval Pending</strong>, then use{" "}
        <strong>School approve</strong> / <strong>Approve</strong> or{" "}
        <strong>Reject</strong> on that page.
      </div>

      {error ? (
        <div className="rounded-lg border border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)] px-4 py-3 text-sm text-[var(--status-rejected-text)]">
          {error.message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            Loading quizzes...
          </div>
        ) : quizzes.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            No quizzes waiting for approval.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {quizzes.map((quiz) => (
              <li key={quiz.quizId}>
                <Link
                  to={`/quizzes/${quiz.quizId}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition hover:bg-slate-50 sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{quiz.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {quiz.createdBy} · {quiz.schoolName} · {quiz.subjectName} ·{" "}
                      {quiz.totalQuestions} questions
                    </p>
                  </div>
                  <StatusBadge
                    label={quiz.approvalStatus || "Pending"}
                    tone={getQuestionStatusTone(quiz.approvalStatus || "Pending", true)}
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
