import { Link } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import {
  getQuestionStatusTone,
  StatusBadge,
} from "@/features/questions/presentation/components/StatusBadge";
import { useStudentQuizzesQuery } from "@/features/student/presentation/hooks/useStudentQuizQueries";

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function StudentQuizzesPage() {
  const { data: quizzes = [], isLoading, error, refetch, isFetching } =
    useStudentQuizzesQuery();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="My quizzes"
        description="View assigned quizzes and start new attempts."
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

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            Loading assigned quizzes...
          </div>
        ) : quizzes.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            No quizzes assigned yet.
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
                    Subject
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Due
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
                {quizzes.map((quiz) => (
                  <tr key={quiz.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/student/quizzes/${quiz.id}`}
                        className="font-medium text-brand-700 hover:text-brand-800"
                      >
                        {quiz.title}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">
                        {quiz.questionCount} questions · {quiz.totalMarks} marks
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {quiz.subject} / {quiz.grade}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDateTime(quiz.dueAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {quiz.attemptLimit > 0
                        ? `${quiz.attemptLimit} allowed`
                        : "Unlimited"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={quiz.resultStatus}
                        tone={getQuestionStatusTone(quiz.resultStatus, true)}
                      />
                      {quiz.resultPercent != null ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {quiz.resultPercent}%
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/student/quizzes/${quiz.id}`}
                        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700"
                      >
                        Open
                      </Link>
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
