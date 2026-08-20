import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, GraduationCap } from "lucide-react";
import { PageHeader } from "@/core/components/PageHeader";
import {
  formatStudentLabel,
} from "@/features/parent/domain/parentTypes";
import { AddChildDialog } from "@/features/parent/presentation/components/AddChildDialog";
import {
  useLinkMyChildMutation,
  useLinkedStudentsQuery,
} from "@/features/parent/presentation/hooks/useParentQueries";

export function ParentChildrenPage() {
  const { data: students = [], isLoading, error, refetch, isFetching } =
    useLinkedStudentsQuery(true);
  const linkMutation = useLinkMyChildMutation();
  const [showAddChild, setShowAddChild] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        title="My children"
        description="Add children by CNIC or username, then monitor quiz history and progress."
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
                setShowAddChild(true);
              }}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Add child
            </button>
            <Link
              to="/quizzes/assignments"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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
              onClick={() => setShowAddChild(true)}
              className="font-medium text-brand-700 underline-offset-2 hover:underline"
            >
              Add child
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
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">
                      {formatStudentLabel(student)}
                    </p>
                    <span className="inline-flex max-w-full truncate rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-800">
                      {student.relationship?.trim() || "Guardian"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {student.username}
                    <span className="mx-1.5 text-slate-300" aria-hidden>
                      ·
                    </span>
                    Roll {student.rollNumber?.trim() || "—"}
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <Building2
                        className="h-3.5 w-3.5 shrink-0 text-slate-400"
                        aria-hidden
                      />
                      <span className="truncate">
                        {student.schoolName?.trim() || "School not assigned"}
                      </span>
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <GraduationCap
                        className="h-3.5 w-3.5 shrink-0 text-slate-400"
                        aria-hidden
                      />
                      <span className="truncate">
                        {student.campusName?.trim() || "Campus not assigned"}
                      </span>
                    </span>
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

      {showAddChild ? (
        <AddChildDialog
          isSubmitting={linkMutation.isPending}
          onClose={() => {
            if (!linkMutation.isPending) {
              setShowAddChild(false);
            }
          }}
          onSubmit={async (identifier, relationship) => {
            const result = await linkMutation.mutateAsync({
              identifier,
              relationship,
            });
            setShowAddChild(false);
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
