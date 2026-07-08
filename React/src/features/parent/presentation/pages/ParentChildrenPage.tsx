import { Link } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { formatStudentLabel } from "@/features/parent/domain/parentTypes";
import { useLinkedStudentsQuery } from "@/features/parent/presentation/hooks/useParentQueries";

export function ParentChildrenPage() {
  const { data: students = [], isLoading, error, refetch, isFetching } =
    useLinkedStudentsQuery(true);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        title="My children"
        description="Linked students for quiz assignment, history, and progress monitoring."
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
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Assignment board
            </Link>
          </div>
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
            Loading linked students...
          </div>
        ) : students.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            No linked students found for this parent account.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {students.map((student) => (
              <article
                key={student.studentId}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {formatStudentLabel(student)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    ID {student.studentId} · Roll {student.rollNumber} ·{" "}
                    {student.relationship}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/parent/children/${student.studentId}/history`}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700"
                  >
                    Quiz history
                  </Link>
                  <Link
                    to={`/quizzes/assignments?studentId=${student.studentId}`}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    View assignments
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
