import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import { formatStudentLabel } from "@/features/parent/domain/parentTypes";
import { useLinkedStudentsQuery } from "@/features/parent/presentation/hooks/useParentQueries";
import {
  displayStudentName,
  formatMonitorStatus,
  getMonitorStatusTone,
} from "@/features/quizzes/domain/quizMonitorTypes";
import { useAssignmentBoardQuery } from "@/features/quizzes/presentation/hooks/useQuizQueries";
import { StatusBadge } from "@/features/questions/presentation/components/StatusBadge";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AssignmentBoardPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isParent = user?.role === "Parent";
  const queryStudentId = Number(searchParams.get("studentId"));
  const [studentFilter, setStudentFilter] = useState<number | "">(
    queryStudentId > 0 ? queryStudentId : "",
  );

  useEffect(() => {
    if (queryStudentId > 0) {
      setStudentFilter(queryStudentId);
    }
  }, [queryStudentId]);

  const { data: linkedStudents = [] } = useLinkedStudentsQuery(isParent);
  const studentId = studentFilter === "" ? null : studentFilter;

  function updateStudentFilter(value: number | "") {
    setStudentFilter(value);
    if (value === "") {
      searchParams.delete("studentId");
    } else {
      searchParams.set("studentId", String(value));
    }
    setSearchParams(searchParams, { replace: true });
  }

  const { data: items = [], isLoading, error, refetch, isFetching } =
    useAssignmentBoardQuery(studentId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Assignment board"
        description="Overview of all quiz assignments across your students."
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
              to="/quizzes"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Back to quizzes
            </Link>
          </div>
        }
      />

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Filter by student ID
        </label>
        {isParent && linkedStudents.length > 0 ? (
          <select
            value={studentFilter === "" ? "" : String(studentFilter)}
            onChange={(event) =>
              updateStudentFilter(
                event.target.value ? Number(event.target.value) : "",
              )
            }
            className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All linked students</option>
            {linkedStudents.map((student) => (
              <option key={student.studentId} value={student.studentId}>
                {formatStudentLabel(student)}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="number"
            min={1}
            value={studentFilter === "" ? "" : studentFilter}
            onChange={(event) =>
              updateStudentFilter(
                event.target.value ? Number(event.target.value) : "",
              )
            }
            placeholder="Optional student ID"
            className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        )}
      </section>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            Loading assignments...
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            No assignments found.
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
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item) => (
                  <tr key={item.assignmentId} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/quizzes/${item.quizId}`}
                        className="font-medium text-brand-700 hover:text-brand-800"
                      >
                        {item.quizTitle}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {displayStudentName(item.studentName, item.studentId)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <p>{formatDateTime(item.startAt)}</p>
                      <p className="text-xs text-slate-500">
                        to {formatDateTime(item.endAt)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.attemptCount}/{item.allowedAttempts}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={formatMonitorStatus(item.resultStatus)}
                        tone={getMonitorStatusTone(item.resultStatus)}
                      />
                      {item.isReviewDone ? (
                        <p className="mt-1 text-xs text-emerald-700">Reviewed</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={formatMonitorStatus(item.monitorStatus)}
                        tone={getMonitorStatusTone(item.monitorStatus)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/quizzes/${item.quizId}/monitoring`}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Monitor
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
