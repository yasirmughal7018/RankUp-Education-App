import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { ApiError } from "@/core/api/types";
import { isAdminRole } from "@/core/api/types";
import { PageHeader } from "@/core/components/PageHeader";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import type {
  ActiveStatusFilter,
  CreateDirectoryParentInput,
  DirectoryParent,
  UpdateDirectoryParentInput,
} from "@/features/directory/domain/directoryTypes";
import { DirectoryPagination } from "@/features/directory/presentation/components/DirectoryPagination";
import { LinkStudentDialog } from "@/features/directory/presentation/components/LinkStudentDialog";
import { ParentFormDialog } from "@/features/directory/presentation/components/ParentFormDialog";
import {
  useActivateParentMutation,
  useBulkDeactivateParentsMutation,
  useCreateParentMutation,
  useDeactivateParentMutation,
  useDirectoryParentsQuery,
  useLinkParentStudentMutation,
  useUnlinkParentStudentMutation,
  useUpdateParentMutation,
} from "@/features/directory/presentation/hooks/useDirectoryQueries";

const PAGE_SIZE = 50;

export function DirectoryParentsPage() {
  const { user } = useAuth();
  const canManage = user != null && isAdminRole(user.role);
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [activeFilter, setActiveFilter] = useState<ActiveStatusFilter>("all");
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [parentDialog, setParentDialog] = useState<
    "create" | DirectoryParent | null
  >(null);
  const [linkParent, setLinkParent] = useState<DirectoryParent | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      search: search || undefined,
      pageNumber,
      pageSize: PAGE_SIZE,
    }),
    [search, pageNumber],
  );

  const { data, isLoading, error, refetch, isFetching } =
    useDirectoryParentsQuery(filters);

  const createMutation = useCreateParentMutation();
  const updateMutation = useUpdateParentMutation();
  const activateMutation = useActivateParentMutation();
  const deactivateMutation = useDeactivateParentMutation();
  const bulkDeactivateMutation = useBulkDeactivateParentsMutation();
  const linkMutation = useLinkParentStudentMutation();
  const unlinkMutation = useUnlinkParentStudentMutation();

  const parents = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;

  const visibleParents = useMemo(() => {
    if (activeFilter === "all") {
      return parents;
    }
    const wantActive = activeFilter === "active";
    return parents.filter((parent) => parent.isActive === wantActive);
  }, [parents, activeFilter]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [pageNumber, search, activeFilter]);

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    activateMutation.isPending ||
    deactivateMutation.isPending ||
    bulkDeactivateMutation.isPending ||
    linkMutation.isPending ||
    unlinkMutation.isPending;

  const allVisibleSelected =
    visibleParents.length > 0 &&
    visibleParents.every((parent) => selectedIds.has(parent.parentId));

  function clearMessages() {
    setActionError(null);
    setSuccessMessage(null);
  }

  function applySearch() {
    setSearch(searchInput.trim());
    setPageNumber(1);
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(visibleParents.map((p) => p.parentId)));
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleFormSubmit(payload: {
    mode: "create" | "edit";
    input: CreateDirectoryParentInput | UpdateDirectoryParentInput;
  }) {
    clearMessages();
    if (payload.mode === "create") {
      const created = await createMutation.mutateAsync(
        payload.input as CreateDirectoryParentInput,
      );
      setSuccessMessage(
        `Created parent ${created.fullName}. User must set password on first login.`,
      );
    } else if (parentDialog && parentDialog !== "create") {
      await updateMutation.mutateAsync({
        parentId: parentDialog.parentId,
        input: payload.input as UpdateDirectoryParentInput,
      });
      setSuccessMessage(`Updated parent ${payload.input.fullName}.`);
    }
    setParentDialog(null);
  }

  async function toggleActive(parent: DirectoryParent) {
    clearMessages();
    try {
      if (parent.isActive) {
        if (!window.confirm(`Deactivate ${parent.fullName}?`)) {
          return;
        }
        await deactivateMutation.mutateAsync(parent.parentId);
        setSuccessMessage(`Deactivated ${parent.fullName}.`);
      } else {
        await activateMutation.mutateAsync(parent.parentId);
        setSuccessMessage(`Activated ${parent.fullName}.`);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(apiError.message ?? "Unable to update parent status.");
    }
  }

  async function handleBulkDeactivate() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      return;
    }
    if (
      !window.confirm(
        `Deactivate ${ids.length} selected parent${ids.length === 1 ? "" : "s"}?`,
      )
    ) {
      return;
    }

    clearMessages();
    try {
      const result = await bulkDeactivateMutation.mutateAsync(ids);
      setSuccessMessage(`Deactivated ${result.affectedCount} parent(s).`);
      setSelectedIds(new Set());
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(apiError.message ?? "Unable to bulk deactivate parents.");
    }
  }

  async function handleLink(studentId: number, relationship: string) {
    if (!linkParent) {
      return;
    }

    clearMessages();
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

    clearMessages();

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
          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <button
                type="button"
                onClick={() => {
                  clearMessages();
                  setParentDialog("create");
                }}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                Create parent
              </button>
            ) : null}
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
        <select
          value={activeFilter}
          onChange={(event) =>
            setActiveFilter(event.target.value as ActiveStatusFilter)
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
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

      {canManage && selectedIds.size > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <span className="text-slate-700">{selectedIds.size} selected</span>
          <button
            type="button"
            onClick={() => void handleBulkDeactivate()}
            disabled={busy}
            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-70"
          >
            Bulk deactivate
          </button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            Loading parents...
          </div>
        ) : visibleParents.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            No parents found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {canManage ? (
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAll}
                          aria-label="Select all parents on this page"
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                      </th>
                    ) : null}
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
                    {canManage ? (
                      <th className="px-4 py-3 text-right font-medium text-slate-600">
                        Actions
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {visibleParents.map((parent) => (
                    <tr key={parent.parentId} className="hover:bg-slate-50">
                      {canManage ? (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(parent.parentId)}
                            onChange={() => toggleSelect(parent.parentId)}
                            aria-label={`Select ${parent.fullName}`}
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                        </td>
                      ) : null}
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {parent.fullName}
                        <p className="text-xs font-normal text-slate-500">
                          ID {parent.parentId}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {parent.username}
                      </td>
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
                      {canManage ? (
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                clearMessages();
                                setParentDialog(parent);
                              }}
                              disabled={busy}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void toggleActive(parent)}
                              disabled={busy}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                            >
                              {parent.isActive ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setLinkParent(parent)}
                              disabled={busy}
                              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
                            >
                              Link
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleUnlink(parent)}
                              disabled={busy}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                            >
                              Unlink
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DirectoryPagination
              pageNumber={pageNumber}
              pageSize={PAGE_SIZE}
              totalCount={totalCount}
              onPageChange={setPageNumber}
              disabled={isFetching}
            />
          </>
        )}
      </div>

      {parentDialog ? (
        <ParentFormDialog
          parent={parentDialog === "create" ? null : parentDialog}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          onClose={() => setParentDialog(null)}
          onSubmit={handleFormSubmit}
        />
      ) : null}

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
