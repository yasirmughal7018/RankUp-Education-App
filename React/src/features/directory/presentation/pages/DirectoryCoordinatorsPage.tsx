import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pencil, UserCheck, UserX } from "lucide-react";
import type { ApiError } from "@/core/api/types";
import { isAdminRole } from "@/core/api/types";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import type {
  CreateDirectoryCoordinatorInput,
  DirectoryCoordinator,
  GrantTeacherRoleInput,
  UpdateDirectoryCoordinatorInput,
} from "@/features/directory/domain/directoryTypes";
import { AccountStatusBadge } from "@/features/directory/presentation/components/AccountStatusBadge";
import { CoordinatorFormDialog } from "@/features/directory/presentation/components/CoordinatorFormDialog";
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
import { GrantTeacherRoleDialog } from "@/features/directory/presentation/components/GrantTeacherRoleDialog";
import {
  useActivateCoordinatorMutation,
  useBulkDeactivateCoordinatorsMutation,
  useCreateCoordinatorMutation,
  useDeactivateCoordinatorMutation,
  useDirectoryCampusesQuery,
  useDirectoryCoordinatorsQuery,
  useDirectorySchoolsQuery,
  useGrantParentRoleToCoordinatorMutation,
  useGrantTeacherRoleToCoordinatorMutation,
  useUpdateCoordinatorMutation,
} from "@/features/directory/presentation/hooks/useDirectoryQueries";
import {
  DIRECTORY_ACCOUNT_STATUS_FILTER_OPTIONS,
  matchesDirectoryAccountStatusFilter,
  type DirectoryAccountStatusFilter,
} from "@/features/directory/presentation/utils/accountStatus";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

/** Paginated coordinator directory with school/campus filters and CRUD actions. */
export function DirectoryCoordinatorsPage() {
  const { user } = useAuth();
  const canManage = user != null && isAdminRole(user.role);
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [schoolId, setSchoolId] = useState("");
  const [campusId, setCampusId] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<DirectoryAccountStatusFilter>("all");
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [coordinatorDialog, setCoordinatorDialog] = useState<
    "create" | DirectoryCoordinator | null
  >(null);
  const [grantParentTarget, setGrantParentTarget] =
    useState<DirectoryCoordinator | null>(null);
  const [grantTeacherTarget, setGrantTeacherTarget] =
    useState<DirectoryCoordinator | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedSchoolId = Number(schoolId) || null;
  const selectedCampusId = Number(campusId) || null;

  const { data: schools = [] } = useDirectorySchoolsQuery(canManage);
  const { data: campuses = [] } = useDirectoryCampusesQuery(
    selectedSchoolId ?? 0,
    selectedSchoolId != null,
  );

  const filters = useMemo(
    () => ({
      search: search || undefined,
      schoolId: selectedSchoolId,
      campusId: selectedCampusId,
      pageNumber,
      pageSize: PAGE_SIZE,
    }),
    [search, selectedSchoolId, selectedCampusId, pageNumber],
  );

  const { data, isLoading, error, refetch, isFetching } =
    useDirectoryCoordinatorsQuery(filters);

  const createMutation = useCreateCoordinatorMutation();
  const updateMutation = useUpdateCoordinatorMutation();
  const activateMutation = useActivateCoordinatorMutation();
  const deactivateMutation = useDeactivateCoordinatorMutation();
  const bulkDeactivateMutation = useBulkDeactivateCoordinatorsMutation();
  const grantParentMutation = useGrantParentRoleToCoordinatorMutation();
  const grantTeacherMutation = useGrantTeacherRoleToCoordinatorMutation();

  const totalCount = data?.totalCount ?? 0;

  const visibleCoordinators = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter((coordinator) =>
      matchesDirectoryAccountStatusFilter(
        coordinator.accountStatus,
        coordinator.isActive,
        activeFilter,
      ),
    );
  }, [data?.items, activeFilter]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [pageNumber, search, schoolId, campusId, activeFilter]);

  useEffect(() => {
    setCampusId("");
    setPageNumber(1);
  }, [schoolId]);

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    activateMutation.isPending ||
    deactivateMutation.isPending ||
    bulkDeactivateMutation.isPending ||
    grantParentMutation.isPending ||
    grantTeacherMutation.isPending;

  const allVisibleSelected =
    visibleCoordinators.length > 0 &&
    visibleCoordinators.every((coordinator) =>
      selectedIds.has(coordinator.userId),
    );

  function clearMessages() {
    setActionError(null);
    setSuccessMessage(null);
  }

  function applyFilters() {
    setSearch(searchInput.trim());
    setPageNumber(1);
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(visibleCoordinators.map((c) => c.userId)));
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
    input: CreateDirectoryCoordinatorInput | UpdateDirectoryCoordinatorInput;
  }) {
    clearMessages();
    if (payload.mode === "create") {
      const created = await createMutation.mutateAsync(
        payload.input as CreateDirectoryCoordinatorInput,
      );
      const createInput = payload.input as CreateDirectoryCoordinatorInput;
      setSuccessMessage(
        `Created coordinator ${created.fullName}${
          createInput.alsoTeacher || createInput.alsoParent
            ? ` with roles: Coordinator${
                createInput.alsoTeacher ? ", Teacher" : ""
              }${createInput.alsoParent ? ", Parent" : ""}`
            : ""
        }. User must set password on first login.`,
      );
    } else if (coordinatorDialog && coordinatorDialog !== "create") {
      await updateMutation.mutateAsync({
        userId: coordinatorDialog.userId,
        input: payload.input as UpdateDirectoryCoordinatorInput,
      });
      setSuccessMessage(`Updated coordinator ${payload.input.fullName}.`);
    }
    setCoordinatorDialog(null);
  }

  async function toggleActive(coordinator: DirectoryCoordinator) {
    clearMessages();
    try {
      if (coordinator.isActive) {
        if (!window.confirm(`Deactivate ${coordinator.fullName}?`)) {
          return;
        }
        await deactivateMutation.mutateAsync(coordinator.userId);
        setSuccessMessage(`Deactivated ${coordinator.fullName}.`);
      } else {
        await activateMutation.mutateAsync(coordinator.userId);
        setSuccessMessage(`Activated ${coordinator.fullName}.`);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(
        apiError.message ?? "Unable to update coordinator status.",
      );
    }
  }

  async function handleBulkDeactivate() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      return;
    }
    if (
      !window.confirm(
        `Deactivate ${ids.length} selected coordinator${ids.length === 1 ? "" : "s"}?`,
      )
    ) {
      return;
    }

    clearMessages();
    try {
      const result = await bulkDeactivateMutation.mutateAsync(ids);
      setSuccessMessage(`Deactivated ${result.affectedCount} coordinator(s).`);
      setSelectedIds(new Set());
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(
        apiError.message ?? "Unable to bulk deactivate coordinators.",
      );
    }
  }

  function rowActions(coordinator: DirectoryCoordinator) {
    if (!canManage) {
      return null;
    }
    const roles = coordinator.roles ?? [];
    const hasParentRole = roles.includes("Parent");
    const hasTeacherRole = roles.includes("Teacher");
    return (
      <>
        <DirectoryIconAction
          icon={Pencil}
          label={`Edit ${coordinator.fullName}`}
          disabled={busy}
          onClick={() => {
            clearMessages();
            setCoordinatorDialog(coordinator);
          }}
        />
        {!hasTeacherRole ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9"
            disabled={busy}
            onClick={() => {
              clearMessages();
              setGrantTeacherTarget(coordinator);
            }}
          >
            + Teacher
          </Button>
        ) : null}
        {!hasParentRole ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9"
            disabled={busy}
            onClick={() => {
              clearMessages();
              setGrantParentTarget(coordinator);
            }}
          >
            + Parent
          </Button>
        ) : null}
        <DirectoryIconAction
          icon={coordinator.isActive ? UserX : UserCheck}
          label={
            coordinator.isActive
              ? `Deactivate ${coordinator.fullName}`
              : `Activate ${coordinator.fullName}`
          }
          disabled={busy}
          onClick={() => void toggleActive(coordinator)}
        />
      </>
    );
  }

  return (
    <DirectoryPageShell
      title="Coordinators"
      primaryAction={
        canManage ? (
          <Button
            type="button"
            size="sm"
            className="h-9 whitespace-nowrap"
            onClick={() => {
              clearMessages();
              setCoordinatorDialog("create");
            }}
          >
            Create coordinator
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
                applyFilters();
              }
            }}
            placeholder="Search coordinators..."
            containerClassName="min-w-0 flex-1 lg:min-w-[200px]"
          />
          <select
            value={schoolId}
            onChange={(event) => setSchoolId(event.target.value)}
            className={cn(directorySelectClassName, "lg:w-44")}
            aria-label="Filter by school"
          >
            <option value="">All schools</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
          <select
            value={campusId}
            onChange={(event) => {
              setCampusId(event.target.value);
              setPageNumber(1);
            }}
            disabled={!selectedSchoolId}
            className={cn(directorySelectClassName, "lg:w-44")}
            aria-label="Filter by campus"
          >
            <option value="">All campuses</option>
            {campuses.map((campus) => (
              <option key={campus.id} value={campus.id}>
                {campus.name}
              </option>
            ))}
          </select>
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
            onClick={applyFilters}
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
        empty={visibleCoordinators.length === 0}
        emptyTitle="No coordinators found"
        emptyDescription="Try a different search or clear filters."
        emptyActionLabel={canManage ? "Create coordinator" : undefined}
        onEmptyAction={
          canManage
            ? () => {
                clearMessages();
                setCoordinatorDialog("create");
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
          {visibleCoordinators.map((coordinator) => (
            <DirectoryEntityCard
              key={coordinator.userId}
              selected={selectedIds.has(coordinator.userId)}
              onSelect={
                canManage ? () => toggleSelect(coordinator.userId) : undefined
              }
              title={coordinator.fullName}
              subtitle={
                (coordinator.roles?.length ?? 0) > 1
                  ? `${coordinator.username} · ${coordinator.roles?.join(", ")}`
                  : coordinator.username
              }
              badge={
                <AccountStatusBadge
                  accountStatus={coordinator.accountStatus}
                  isActive={coordinator.isActive}
                />
              }
              meta={
                <>
                  {coordinator.teacherCode ? (
                    <p>Code {coordinator.teacherCode}</p>
                  ) : null}
                  <p>
                    {coordinator.schoolName} · {coordinator.campusName}
                  </p>
                </>
              }
              actions={rowActions(coordinator)}
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
                  aria-label="Select all coordinators on this page"
                  className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                />
              </DirectoryTh>
            ) : null}
            <DirectoryTh>Name</DirectoryTh>
            <DirectoryTh>Code</DirectoryTh>
            <DirectoryTh>School / Campus</DirectoryTh>
            <DirectoryTh>Status</DirectoryTh>
            {canManage ? <DirectoryTh align="right">Actions</DirectoryTh> : null}
          </DirectoryTableHead>
          <tbody className="divide-y divide-border">
            {visibleCoordinators.map((coordinator) => (
              <tr
                key={coordinator.userId}
                className="transition hover:bg-muted/40"
              >
                {canManage ? (
                  <DirectoryTd>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(coordinator.userId)}
                      onChange={() => toggleSelect(coordinator.userId)}
                      aria-label={`Select ${coordinator.fullName}`}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                    />
                  </DirectoryTd>
                ) : null}
                <DirectoryTd>
                  <p className="font-medium">{coordinator.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {coordinator.username}
                  </p>
                  {(coordinator.roles?.length ?? 0) > 1 ? (
                    <p className="mt-0.5 text-xs font-medium text-primary">
                      Roles: {coordinator.roles?.join(", ")}
                    </p>
                  ) : null}
                </DirectoryTd>
                <DirectoryTd>{coordinator.teacherCode || "—"}</DirectoryTd>
                <DirectoryTd className="text-muted-foreground">
                  {coordinator.schoolName} / {coordinator.campusName}
                </DirectoryTd>
                <DirectoryTd>
                  <AccountStatusBadge
                    accountStatus={coordinator.accountStatus}
                    isActive={coordinator.isActive}
                  />
                </DirectoryTd>
                {canManage ? (
                  <DirectoryTd align="right">
                    <div className="flex justify-end gap-2">
                      {rowActions(coordinator)}
                    </div>
                  </DirectoryTd>
                ) : null}
              </tr>
            ))}
          </tbody>
        </DirectoryTable>
      </DirectoryListPanel>

      {coordinatorDialog ? (
        <CoordinatorFormDialog
          coordinator={
            coordinatorDialog === "create" ? null : coordinatorDialog
          }
          schools={schools}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          onClose={() => setCoordinatorDialog(null)}
          onSubmit={handleFormSubmit}
        />
      ) : null}

      {grantTeacherTarget ? (
        <GrantTeacherRoleDialog
          person={grantTeacherTarget}
          schools={schools}
          isSubmitting={grantTeacherMutation.isPending}
          onClose={() => setGrantTeacherTarget(null)}
          onSubmit={async (input: GrantTeacherRoleInput) => {
            clearMessages();
            try {
              await grantTeacherMutation.mutateAsync({
                userId: grantTeacherTarget.userId,
                input,
              });
              setSuccessMessage(
                `Teacher role added to ${grantTeacherTarget.fullName}.`,
              );
              setGrantTeacherTarget(null);
            } catch (err) {
              const apiError = err as ApiError;
              setActionError(
                apiError.message ?? "Unable to add Teacher role.",
              );
              throw err;
            }
          }}
        />
      ) : null}

      <AppConfirmDialog
        open={grantParentTarget != null}
        onOpenChange={(open) => {
          if (!open && !grantParentMutation.isPending) {
            setGrantParentTarget(null);
          }
        }}
        title="Add Parent role"
        description={
          grantParentTarget
            ? `Add the Parent role to ${grantParentTarget.fullName}? They keep Coordinator access and can also hold Teacher. Switch roles after login.`
            : ""
        }
        confirmLabel="Add Parent role"
        loading={grantParentMutation.isPending}
        onConfirm={() => {
          if (!grantParentTarget) {
            return;
          }
          void (async () => {
            try {
              await grantParentMutation.mutateAsync(grantParentTarget.userId);
              setSuccessMessage(
                `Parent role added to ${grantParentTarget.fullName}.`,
              );
              setGrantParentTarget(null);
            } catch (err) {
              const apiError = err as ApiError;
              setActionError(
                apiError.message ?? "Unable to add Parent role.",
              );
            }
          })();
        }}
      />
    </DirectoryPageShell>
  );
}
