import { useState } from "react";
import { Link } from "react-router-dom";
import type { ApiError } from "@/core/api/types";
import { PageHeader } from "@/core/components/PageHeader";
import { formatTutorStudentLabel } from "@/features/tutor/domain/tutorTypes";
import { LinkTutorStudentDialog } from "@/features/tutor/presentation/components/LinkTutorStudentDialog";
import {
  useLinkTutorStudentMutation,
  useTutorLinkedStudentsQuery,
  useUnlinkTutorStudentMutation,
} from "@/features/tutor/presentation/hooks/useTutorQueries";

export function TutorStudentsPage() {
  const { data: students = [], isLoading, error, refetch, isFetching } =
    useTutorLinkedStudentsQuery(true);
  const linkMutation = useLinkTutorStudentMutation();
  const unlinkMutation = useUnlinkTutorStudentMutation();
  const [showLink, setShowLink] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        title="My students"
        description="Link students by CNIC or username. Quizzes you create stay on your account and do not change a student’s school."
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
            <button
              type="button"
              onClick={() => {
                setSuccessMessage(null);
                setShowLink(true);
              }}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Link student
            </button>
            <Link
              to="/quizzes"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Quizzes
            </Link>
          </div>
        }
      />

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            Loading linked students...
          </div>
        ) : students.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            No linked students yet. Use{" "}
            <button
              type="button"
              onClick={() => setShowLink(true)}
              className="font-medium text-brand-700 underline-offset-2 hover:underline"
            >
              Link student
            </button>{" "}
            with their CNIC or username.
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
                    {formatTutorStudentLabel(student)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    @{student.username}
                    {student.schoolName ? ` · ${student.schoolName}` : ""}
                    {student.rollNumber ? ` · Roll ${student.rollNumber}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/tutor/students/${student.studentId}/history`}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700"
                  >
                    Quiz history
                  </Link>
                  <Link
                    to={`/quizzes/assignments?studentId=${student.studentId}`}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Assignments
                  </Link>
                  <button
                    type="button"
                    disabled={unlinkMutation.isPending}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Unlink ${student.fullName}? They stay in their school.`,
                        )
                      ) {
                        return;
                      }
                      void unlinkMutation
                        .mutateAsync(student.studentId)
                        .then(() => {
                          setSuccessMessage(
                            `${student.fullName} was unlinked from your account.`,
                          );
                        })
                        .catch((err: ApiError) => {
                          setSuccessMessage(null);
                          window.alert(err.message ?? "Unable to unlink student.");
                        });
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                  >
                    Unlink
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {showLink ? (
        <LinkTutorStudentDialog
          isSubmitting={linkMutation.isPending}
          onClose={() => {
            if (!linkMutation.isPending) {
              setShowLink(false);
            }
          }}
          onSubmit={async (identifier) => {
            const result = await linkMutation.mutateAsync({ identifier });
            setShowLink(false);
            setSuccessMessage(
              result.alreadyLinked
                ? `${result.fullName} was already linked to your account.`
                : `${result.fullName} was linked successfully.`,
            );
          }}
        />
      ) : null}
    </div>
  );
}
