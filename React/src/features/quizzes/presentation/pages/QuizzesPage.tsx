import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import {
  getQuestionStatusTone,
  StatusBadge,
} from "@/features/questions/presentation/components/StatusBadge";
import { useQuizzesQuery } from "@/features/quizzes/presentation/hooks/useQuizQueries";

/** Teacher/parent quiz list with search and mine-only filter. */
export function QuizzesPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showMineOnly, setShowMineOnly] = useState(true);

  const { data: quizzes = [], isLoading, error, refetch, isFetching } =
    useQuizzesQuery(search);

  const visibleQuizzes = showMineOnly
    ? quizzes.filter((quiz) => quiz.createdBy === String(user?.id))
    : quizzes;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Quiz management"
        description="Create, publish, and assign quizzes for students."
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
            >
              Refresh
            </button>
            <Link
              to="/quizzes/assignments"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Assignments
            </Link>
            <Link
              to="/quizzes/reviews/pending"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Pending reviews
            </Link>
            <Link
              to="/quizzes/new"
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              New quiz
            </Link>
          </div>
        }
      />

      <section className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_auto]">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search quizzes..."
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={showMineOnly}
            onChange={(event) => setShowMineOnly(event.target.checked)}
          />
          Show only my quizzes
        </label>
      </section>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            Loading quizzes...
          </div>
        ) : visibleQuizzes.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            No quizzes found.
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
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Questions
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {visibleQuizzes.map((quiz) => (
                  <tr key={quiz.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/quizzes/${quiz.id}`}
                        className="font-medium text-brand-700 hover:text-brand-800"
                      >
                        {quiz.title}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">
                        {quiz.quizType} · {quiz.schoolName}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {quiz.subject} / {quiz.grade}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={quiz.status}
                        tone={getQuestionStatusTone(quiz.status, true)}
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {quiz.questionCount} · {quiz.totalMarks} marks
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/quizzes/${quiz.id}`}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Manage
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
