import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Link2, Pencil, Unlink, UserCheck, UserX } from "lucide-react";
import type { ApiError } from "@/core/api/types";
import { isAdminRole } from "@/core/api/types";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import type {
  CreateDirectoryParentInput,
  DirectoryParent,
  UpdateDirectoryParentInput,
} from "@/features/directory/domain/directoryTypes";
import { AccountStatusBadge } from "@/features/directory/presentation/components/AccountStatusBadge";
import {
  DirectoryBulkBar,
  DirectoryEntityCard,
  DirectoryFilterPanel,
  DirectoryFlash,
  DirectoryIconAction,
  DirectoryListPanel,
  DirectoryMobileList,
  DirectoryPageShell,
  DirectoryTable,
  DirectoryTableHead,
  DirectoryTd,
  DirectoryTh,
  directorySelectClassName,
} from "@/features/directory/presentation/components/DirectoryListChrome";
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
import {
  DIRECTORY_ACCOUNT_STATUS_FILTER_OPTIONS,
  matchesDirectoryAccountStatusFilter,
  type DirectoryAccountStatusFilter,
} from "@/features/directory/presentation/utils/accountStatus";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

function formatLinkedStudents(parent: DirectoryParent): string {
  const count = parent.linkedStudentCount;
  const names = parent.linkedStudentNames?.filter(Boolean) ?? [];

  if (count === 0) {
    return "No linked students";
  }

  if (names.length > 0) {
    return `${count} linked · ${names.join(", ")}`;
  }

  return `${count} linked student${count === 1 ? "" : "s"}`;
}

/** Paginated parent directory with student linking and account management. */
export function DirectoryParentsPage() {
  const { user } = useAuth();
  const canManage = user != null && isAdminRole(user.role);
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [activeFilter, setActiveFilter] =
    useState<DirectoryAccountStatusFilter>("all");
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

  const visibleParents = useMemo(
    () =>
      parents.filter((parent) =>
        matchesDirectoryAccountStatusFilter(
          parent.accountStatus,
          parent.isActive,
          activeFilter,
        ),
      ),
    [parents, activeFilter],
  );

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

  function rowActions(parent: DirectoryParent) {
    if (!canManage) {
      return null;
    }
    return (
      <>
        <DirectoryIconAction
          icon={Pencil}
          label={`Edit ${parent.fullName}`}
          disabled={busy}
          onClick={() => {
            clearMessages();
            setParentDialog(parent);
          }}
        />
        <DirectoryIconAction
          icon={parent.isActive ? UserX : UserCheck}
          label={
            parent.isActive
              ? `Deactivate ${parent.fullName}`
              : `Activate ${parent.fullName}`
          }
          disabled={busy}
          onClick={() => void toggleActive(parent)}
        />
        <DirectoryIconAction
          icon={Link2}
          label={`Link student to ${parent.fullName}`}
          variant="default"
          disabled={busy}
          onClick={() => setLinkParent(parent)}
        />
        <DirectoryIconAction
          icon={Unlink}
          label={`Unlink student from ${parent.fullName}`}
          disabled={busy}
          onClick={() => void handleUnlink(parent)}
        />
      </>
    );
  }

  return (
    <DirectoryPageShell
      title="Parents"
      primaryAction={
        canManage ? (
          <Button
            type="button"
            size="sm"
            className="h-9 whitespace-nowrap"
            onClick={() => {
              clearMessages();
              setParentDialog("create");
            }}
          >
            Create parent
          </Button>
        ) : null
      }
    >
      <DirectoryFilterPanel>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <AppSearchInput
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                applySearch();
              }
            }}
            placeholder="Search parents..."
            containerClassName="min-w-0 flex-1 lg:min-w-[200px]"
          />
          <select
            value={activeFilter}
            onChange={(event) =>
              setActiveFilter(
                event.target.value as DirectoryAccountStatusFilter,
              )
            }
            className={cn(directorySelectClassName, "lg:w-40")}
            aria-label="Filter by status"
          >
            {DIRECTORY_ACCOUNT_STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            className="h-11 shrink-0 sm:h-10"
            onClick={applySearch}
          >
            Search
          </Button>
        </div>
      </DirectoryFilterPanel>

      <DirectoryFlash
        error={error?.message ?? actionError}
        success={successMessage}
        onRetry={error ? () => void refetch() : undefined}
      />

      <DirectoryBulkBar count={canManage ? selectedIds.size : 0}>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={busy}
          onClick={() => void handleBulkDeactivate()}
        >
          Bulk deactivate
        </Button>
      </DirectoryBulkBar>

      <DirectoryListPanel
        loading={isLoading}
        empty={visibleParents.length === 0}
        emptyTitle="No parents found"
        emptyDescription="Try a different search or clear filters."
        emptyActionLabel={canManage ? "Create parent" : undefined}
        onEmptyAction={
          canManage
            ? () => {
                clearMessages();
                setParentDialog("create");
              }
            : undefined
        }
        footer={
          <DirectoryPagination
            pageNumber={pageNumber}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
            onPageChange={setPageNumber}
            disabled={isFetching}
          />
        }
      >
        <DirectoryMobileList>
          {visibleParents.map((parent) => (
            <DirectoryEntityCard
              key={parent.parentId}
              selected={selectedIds.has(parent.parentId)}
              onSelect={
                canManage ? () => toggleSelect(parent.parentId) : undefined
              }
              title={parent.fullName}
              subtitle={`@${parent.username}`}
              badge={
                <AccountStatusBadge
                  accountStatus={parent.accountStatus}
                  isActive={parent.isActive}
                />
              }
              meta={<p>{formatLinkedStudents(parent)}</p>}
              actions={rowActions(parent)}
            />
          ))}
        </DirectoryMobileList>

        <DirectoryTable>
          <DirectoryTableHead>
            {canManage ? (
              <DirectoryTh>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all parents on this page"
                  className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                />
              </DirectoryTh>
            ) : null}
            <DirectoryTh>Name</DirectoryTh>
            <DirectoryTh>Linked students</DirectoryTh>
            <DirectoryTh>Status</DirectoryTh>
            {canManage ? <DirectoryTh align="right">Actions</DirectoryTh> : null}
          </DirectoryTableHead>
          <tbody className="divide-y divide-border">
            {visibleParents.map((parent) => (
              <tr
                key={parent.parentId}
                className="transition hover:bg-muted/40"
              >
                {canManage ? (
                  <DirectoryTd>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(parent.parentId)}
                      onChange={() => toggleSelect(parent.parentId)}
                      aria-label={`Select ${parent.fullName}`}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                    />
                  </DirectoryTd>
                ) : null}
                <DirectoryTd>
                  <p className="font-medium">{parent.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    @{parent.username}
                  </p>
                </DirectoryTd>
                <DirectoryTd>
                  <p>{parent.linkedStudentCount}</p>
                  {parent.linkedStudentNames &&
                  parent.linkedStudentNames.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {parent.linkedStudentNames.join(", ")}
                    </p>
                  ) : null}
                </DirectoryTd>
                <DirectoryTd>
                  <AccountStatusBadge
                    accountStatus={parent.accountStatus}
                    isActive={parent.isActive}
                  />
                </DirectoryTd>
                {canManage ? (
                  <DirectoryTd align="right">
                    <div className="flex justify-end gap-1.5">
                      {rowActions(parent)}
                    </div>
                  </DirectoryTd>
                ) : null}
              </tr>
            ))}
          </tbody>
        </DirectoryTable>
      </DirectoryListPanel>

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
    </DirectoryPageShell>
  );
}
