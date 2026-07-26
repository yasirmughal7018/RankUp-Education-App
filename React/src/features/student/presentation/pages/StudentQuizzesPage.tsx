import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FieldLabel } from "@/core/components/FieldLabel";
import { PageHeader } from "@/core/components/PageHeader";
import {
  getQuestionStatusTone,
  StatusBadge,
} from "@/features/questions/presentation/components/StatusBadge";
import { useStudentQuizzesQuery } from "@/features/student/presentation/hooks/useStudentQuizQueries";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";

const inputClassName = FORM_FIELD_CLASS;

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

  const [search, setSearch] = useState("");
  const [quizTypeFilter, setQuizTypeFilter] = useState("");
  const [resultStatusFilter, setResultStatusFilter] = useState("");

  const quizTypeOptions = useMemo(
    () =>
      [...new Set(quizzes.map((quiz) => quiz.quizType).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [quizzes],
  );

  const resultStatusOptions = useMemo(
    () =>
      [
        ...new Set(quizzes.map((quiz) => quiz.resultStatus).filter(Boolean)),
      ].sort((a, b) => a.localeCompare(b)),
    [quizzes],
  );

  const filteredQuizzes = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return quizzes.filter((quiz) => {
      if (quizTypeFilter && quiz.quizType !== quizTypeFilter) {
        return false;
      }

      if (resultStatusFilter && quiz.resultStatus !== resultStatusFilter) {
        return false;
      }

      if (!needle) {
        return true;
      }

      const haystack = [
        quiz.title,
        quiz.subject,
        quiz.grade,
        quiz.quizType,
        quiz.resultStatus,
        quiz.dueAt ? formatDateTime(quiz.dueAt) : "",
        quiz.startAt ? formatDateTime(quiz.startAt) : "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [quizzes, search, quizTypeFilter, resultStatusFilter]);

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

      <section className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <FieldLabel htmlFor="student-quiz-search" optional>
            Search
          </FieldLabel>
          <input
            id="student-quiz-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Title, subject, type, status…"
            className={inputClassName}
          />
        </div>

        <div>
          <FieldLabel htmlFor="student-quiz-type" optional>
            Quiz type
          </FieldLabel>
          <select
            id="student-quiz-type"
            value={quizTypeFilter}
            onChange={(event) => setQuizTypeFilter(event.target.value)}
            className={inputClassName}
          >
            <option value="">All types</option>
            {quizTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel htmlFor="student-quiz-result" optional>
            Result status
          </FieldLabel>
          <select
            id="student-quiz-result"
            value={resultStatusFilter}
            onChange={(event) => setResultStatusFilter(event.target.value)}
            className={inputClassName}
          >
            <option value="">All statuses</option>
            {resultStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </section>

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
        ) : filteredQuizzes.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            {quizzes.length === 0
              ? "No quizzes assigned yet."
              : "No quizzes match your filters."}
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
                {filteredQuizzes.map((quiz) => (
                  <tr key={quiz.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/student/quizzes/${quiz.id}`}
                        className="font-medium text-brand-700 hover:text-brand-800"
                      >
                        {quiz.title}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">
                        {quiz.quizType} · {quiz.questionCount} questions ·{" "}
                        {quiz.totalMarks} marks
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
