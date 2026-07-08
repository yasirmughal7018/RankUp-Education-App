import { useState } from "react";
import { Link } from "react-router-dom";
import type { ApiError } from "@/core/api/types";
import { PageHeader } from "@/core/components/PageHeader";
import type { DirectoryParent } from "@/features/directory/domain/directoryTypes";
import { LinkStudentDialog } from "@/features/directory/presentation/components/LinkStudentDialog";
import {
  useDirectoryParentsQuery,
  useLinkParentStudentMutation,
  useUnlinkParentStudentMutation,
} from "@/features/directory/presentation/hooks/useDirectoryQueries";

export function DirectoryParentsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [linkParent, setLinkParent] = useState<DirectoryParent | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: parents = [], isLoading, error, refetch, isFetching } =
    useDirectoryParentsQuery(search || undefined);
  const linkMutation = useLinkParentStudentMutation();
  const unlinkMutation = useUnlinkParentStudentMutation();

  function applySearch() {
    setSearch(searchInput.trim());
  }

  async function handleLink(studentId: number, relationship: string) {
    if (!linkParent) {
      return;
    }

    setActionError(null);
    setSuccessMessage(null);
    await linkMutation.mutateAsync({
      parentId: linkParent.parentId,
      input: { studentId, relationship },
    });
    setSuccessMessage(
      `Linked student ${studentId} to ${linkParent.fullName}.`,
    );
    setLinkParent(null);
  }

  async function handleUnlink(parent: DirectoryParent) {
    const raw = window.prompt(
      `Enter the student ID to unlink from ${parent.fullName}:`,
    );
    if (!raw) {
      return;
    }

    const studentId = Number(raw);
    if (!studentId || studentId < 1) {
      setActionError("Enter a valid student ID to unlink.");
      return;
    }

    if (
      !window.confirm(
        `Unlink student ${studentId} from ${parent.fullName}?`,
      )
    ) {
      return;
    }

    setActionError(null);
    setSuccessMessage(null);

    try {
      await unlinkMutation.mutateAsync({
        parentId: parent.parentId,
        studentId,
      });
      setSuccessMessage(
        `Unlinked student ${studentId} from ${parent.fullName}.`,
      );
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(apiError.message ?? "Unable to unlink student.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Parents"
        description="Search parents and manage linked student relationships."
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
              to="/admin/directory"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Directory home
            </Link>
          </div>
        }
      />

      <section className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4">
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              applySearch();
            }
          }}
          placeholder="Search parents..."
          className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={applySearch}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          Search
        </button>
      </section>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </div>
      ) : null}

      {actionError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            Loading parents...
          </div>
        ) : parents.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            No parents found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Username
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Linked students
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
                {parents.map((parent) => (
                  <tr key={parent.parentId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {parent.fullName}
                      <p className="text-xs font-normal text-slate-500">
                        ID {parent.parentId}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{parent.username}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {parent.linkedStudentCount}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          parent.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {parent.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setLinkParent(parent)}
                          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700"
                        >
                          Link
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleUnlink(parent)}
                          disabled={unlinkMutation.isPending}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                        >
                          Unlink
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {linkParent ? (
        <LinkStudentDialog
          parentName={linkParent.fullName}
          isSubmitting={linkMutation.isPending}
          onClose={() => setLinkParent(null)}
          onSubmit={handleLink}
        />
      ) : null}
    </div>
  );
}
