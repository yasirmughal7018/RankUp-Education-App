import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pencil } from "lucide-react";
import type { ApiError } from "@/core/api/types";
import { isAdminRole } from "@/core/api/types";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import type {
  CreateDirectoryCoordinatorInput,
  DirectoryCoordinator,
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
  DirectoryRowOverflowMenu,
  DirectoryTable,
  DirectoryTableHead,
  DirectoryTd,
  DirectoryTh,
  directorySelectClassName,
} from "@/features/directory/presentation/components/DirectoryListChrome";
import { DirectoryPagination } from "@/features/directory/presentation/components/DirectoryPagination";
import { GrantTeacherRoleDialog } from "@/features/directory/presentation/components/GrantTeacherRoleDialog";
import { RemoveDirectoryRoleDialog } from "@/features/directory/presentation/components/RemoveDirectoryRoleDialog";
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
  useRemoveDirectoryRoleMutation,
  useUpdateCoordinatorMutation,
} from "@/features/directory/presentation/hooks/useDirectoryQueries";
import {
  DIRECTORY_ACCOUNT_STATUS_FILTER_OPTIONS,
  matchesDirectoryAccountStatusFilter,
  type DirectoryAccountStatusFilter,
} from "@/features/directory/presentation/utils/accountStatus";
import {
  getRemovableDirectoryRoles,
  type DirectoryCombinableRole,
} from "@/features/directory/presentation/utils/directoryRoles";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

type CompanionRolesFilter =
  | "all"
  | "withTeacher"
  | "withParent"
  | "coordinatorOnly";

function formatCompanionRoles(coordinator: DirectoryCoordinator): string {
  const roles = coordinator.roles ?? [];
  const extras = roles.filter((role) => role !== "Coordinator");
  if (extras.length === 0) {
    return "Coordinator only";
  }
  return extras.join(", ");
}

function matchesCompanionRolesFilter(
  coordinator: DirectoryCoordinator,
  filter: CompanionRolesFilter,
): boolean {
  const roles = coordinator.roles ?? [];
  const hasTeacher = roles.includes("Teacher");
  const hasParent = roles.includes("Parent");

  switch (filter) {
    case "withTeacher":
      return hasTeacher;
    case "withParent":
      return hasParent;
    case "coordinatorOnly":
      return !hasTeacher && !hasParent;
    default:
      return true;
  }
}

/** Paginated coordinator directory with school/campus filters and CRUD actions. */
export function DirectoryCoordinatorsPage() {
  const { user } = useAuth();
  const canManage = user != null && isAdminRole(user.role);
  const isPortalAdmin = user?.role === "PortalAdmin";
  const isSchoolAdmin = user?.role === "SchoolAdmin";
  const isCampusAdmin = user?.role === "CampusAdmin";
  const lockedSchoolId =
    (isSchoolAdmin || isCampusAdmin) && user?.schoolId != null
      ? user.schoolId
      : null;
  const lockedCampusId =
    isCampusAdmin && user?.campusId != null ? user.campusId : null;
  const showSchoolFilter = isPortalAdmin;
  const showCampusFilter = isPortalAdmin || isSchoolAdmin;

  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [schoolId, setSchoolId] = useState(
    lockedSchoolId != null ? String(lockedSchoolId) : "",
  );
  const [campusId, setCampusId] = useState(
    lockedCampusId != null ? String(lockedCampusId) : "",
  );
  const [rolesFilter, setRolesFilter] = useState<CompanionRolesFilter>("all");
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
  const [deactivateTarget, setDeactivateTarget] =
    useState<DirectoryCoordinator | null>(null);
  const [bulkDeactivateOpen, setBulkDeactivateOpen] = useState(false);
  const [removeRoleTarget, setRemoveRoleTarget] = useState<{
    userId: number;
    fullName: string;
    role: DirectoryCombinableRole;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedSchoolId = lockedSchoolId ?? (Number(schoolId) || null);
  const selectedCampusId = lockedCampusId ?? (Number(campusId) || null);

  const { data: schools = [] } = useDirectorySchoolsQuery(canManage);
  const { data: campuses = [] } = useDirectoryCampusesQuery(
    selectedSchoolId ?? 0,
    canManage && showCampusFilter && selectedSchoolId != null,
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
  const removeRoleMutation = useRemoveDirectoryRoleMutation();

  const totalCount = data?.totalCount ?? 0;

  const visibleCoordinators = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter(
      (coordinator) =>
        matchesDirectoryAccountStatusFilter(
          coordinator.accountStatus,
          coordinator.isActive,
          activeFilter,
        ) && matchesCompanionRolesFilter(coordinator, rolesFilter),
    );
  }, [data?.items, activeFilter, rolesFilter]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [pageNumber, search, schoolId, campusId, rolesFilter, activeFilter]);

  useEffect(() => {
    if (lockedSchoolId != null || lockedCampusId != null) {
      return;
    }
    setCampusId("");
    setPageNumber(1);
  }, [schoolId, lockedSchoolId, lockedCampusId]);

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    activateMutation.isPending ||
    deactivateMutation.isPending ||
    bulkDeactivateMutation.isPending ||
    grantParentMutation.isPending ||
    grantTeacherMutation.isPending ||
    removeRoleMutation.isPending;

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
      setSuccessMessage(
        `Created coordinator ${created.fullName}. User must set password on first login.`,
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
    if (coordinator.isActive) {
      setDeactivateTarget(coordinator);
      return;
    }

    try {
      await activateMutation.mutateAsync(coordinator.userId);
      setSuccessMessage(`Activated ${coordinator.fullName}.`);
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(
        apiError.message ?? "Unable to update coordinator status.",
      );
    }
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) {
      return;
    }

    clearMessages();
    try {
      await deactivateMutation.mutateAsync(deactivateTarget.userId);
      setSuccessMessage(`Deactivated ${deactivateTarget.fullName}.`);
      setDeactivateTarget(null);
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(
        apiError.message ?? "Unable to update coordinator status.",
      );
    }
  }

  async function confirmBulkDeactivate() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      setBulkDeactivateOpen(false);
      return;
    }

    clearMessages();
    try {
      const result = await bulkDeactivateMutation.mutateAsync(ids);
      setSuccessMessage(`Deactivated ${result.affectedCount} coordinator(s).`);
      setSelectedIds(new Set());
      setBulkDeactivateOpen(false);
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
    const removableRoles = getRemovableDirectoryRoles(roles, "Coordinator");
    const overflowItems = [
      {
        id: "toggle-active",
        label: coordinator.isActive ? "Deactivate" : "Activate",
        onSelect: () => void toggleActive(coordinator),
        disabled: busy,
        tone: coordinator.isActive ? ("danger" as const) : ("default" as const),
      },
      ...(!hasTeacherRole
        ? [
            {
              id: "add-teacher",
              label: "Add Teacher role",
              onSelect: () => {
                clearMessages();
                setGrantTeacherTarget(coordinator);
              },
              disabled: busy,
            },
          ]
        : []),
      ...(!hasParentRole
        ? [
            {
              id: "add-parent",
              label: "Add Parent role",
              onSelect: () => {
                clearMessages();
                setGrantParentTarget(coordinator);
              },
              disabled: busy,
            },
          ]
        : []),
      ...removableRoles.map((role) => ({
        id: `remove-${role.toLowerCase()}`,
        label: `Remove ${role} role`,
        onSelect: () => {
          clearMessages();
          setRemoveRoleTarget({
            userId: coordinator.userId,
            fullName: coordinator.fullName,
            role,
          });
        },
        disabled: busy,
        tone: "danger" as const,
      })),
    ];

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
        <DirectoryRowOverflowMenu
          label={`More actions for ${coordinator.fullName}`}
          disabled={busy}
          items={overflowItems}
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
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5">
          <AppSearchInput
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                applyFilters();
              }
            }}
            placeholder="Search by name, code, username, or mobile…"
            containerClassName="min-w-[14rem] flex-1"
          />
          {showSchoolFilter ? (
            <select
              value={schoolId}
              onChange={(event) => setSchoolId(event.target.value)}
              className={cn(directorySelectClassName, "w-36 shrink-0")}
              aria-label="Filter by school"
            >
              <option value="">All schools</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          ) : null}
          {showCampusFilter ? (
            <select
              value={campusId}
              onChange={(event) => {
                setCampusId(event.target.value);
                setPageNumber(1);
              }}
              disabled={selectedSchoolId == null}
              className={cn(directorySelectClassName, "w-36 shrink-0")}
              aria-label="Filter by campus"
            >
              <option value="">All campuses</option>
              {campuses.map((campus) => (
                <option key={campus.id} value={campus.id}>
                  {campus.name}
                </option>
              ))}
            </select>
          ) : null}
          <select
            value={rolesFilter}
            onChange={(event) => {
              setRolesFilter(event.target.value as CompanionRolesFilter);
              setPageNumber(1);
            }}
            className={cn(directorySelectClassName, "w-44 shrink-0")}
            aria-label="Filter by companion roles"
          >
            <option value="all">All roles</option>
            <option value="withTeacher">Also Teacher</option>
            <option value="withParent">Also Parent</option>
            <option value="coordinatorOnly">Coordinator only</option>
          </select>
          <select
            value={activeFilter}
            onChange={(event) =>
              setActiveFilter(
                event.target.value as DirectoryAccountStatusFilter,
              )
            }
            className={cn(directorySelectClassName, "w-36 shrink-0")}
            aria-label="Filter by account status"
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
          onClick={() => setBulkDeactivateOpen(true)}
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
                  <p>Code {coordinator.teacherCode || "—"}</p>
                  <p>
                    {coordinator.schoolName} · {coordinator.campusName}
                  </p>
                  <p>{formatCompanionRoles(coordinator)}</p>
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
            <DirectoryTh>Roles</DirectoryTh>
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
                <DirectoryTd className="text-muted-foreground">
                  {formatCompanionRoles(coordinator)}
                </DirectoryTd>
                <DirectoryTd>
                  <AccountStatusBadge
                    accountStatus={coordinator.accountStatus}
                    isActive={coordinator.isActive}
                  />
                </DirectoryTd>
                {canManage ? (
                  <DirectoryTd align="right">
                    <div className="flex justify-end gap-1.5">
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
          isSubmitting={grantTeacherMutation.isPending}
          lockSchoolCampus
          defaults={{
            schoolId: grantTeacherTarget.schoolId,
            campusId: grantTeacherTarget.campusId,
            schoolName: grantTeacherTarget.schoolName,
            campusName: grantTeacherTarget.campusName,
            teacherCode: grantTeacherTarget.teacherCode,
          }}
          onClose={() => setGrantTeacherTarget(null)}
          onSubmit={async (input) => {
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

      <AppConfirmDialog
        open={deactivateTarget != null}
        onOpenChange={(open) => {
          if (!open && !deactivateMutation.isPending) {
            setDeactivateTarget(null);
          }
        }}
        title="Deactivate coordinator"
        description={
          deactivateTarget
            ? `Deactivate ${deactivateTarget.fullName}? They will not be able to sign in until activated again.`
            : ""
        }
        confirmLabel="Deactivate"
        destructive
        loading={deactivateMutation.isPending}
        onConfirm={() => void confirmDeactivate()}
      />

      <AppConfirmDialog
        open={bulkDeactivateOpen}
        onOpenChange={(open) => {
          if (!open && !bulkDeactivateMutation.isPending) {
            setBulkDeactivateOpen(false);
          }
        }}
        title="Bulk deactivate coordinators"
        description={`Deactivate ${selectedIds.size} selected coordinator${selectedIds.size === 1 ? "" : "s"}? They will not be able to sign in until activated again.`}
        confirmLabel="Deactivate"
        destructive
        loading={bulkDeactivateMutation.isPending}
        onConfirm={() => void confirmBulkDeactivate()}
      />

      <RemoveDirectoryRoleDialog
        open={removeRoleTarget != null}
        personName={removeRoleTarget?.fullName ?? ""}
        role={removeRoleTarget?.role ?? null}
        isSubmitting={removeRoleMutation.isPending}
        onClose={() => setRemoveRoleTarget(null)}
        onConfirm={() => {
          if (!removeRoleTarget) {
            return;
          }
          void (async () => {
            try {
              await removeRoleMutation.mutateAsync({
                context: "coordinators",
                userId: removeRoleTarget.userId,
                role: removeRoleTarget.role,
              });
              setSuccessMessage(
                `${removeRoleTarget.role} role removed from ${removeRoleTarget.fullName}.`,
              );
              setRemoveRoleTarget(null);
            } catch (err) {
              const apiError = err as ApiError;
              setActionError(
                apiError.message ?? "Unable to remove role.",
              );
            }
          })();
        }}
      />
    </DirectoryPageShell>
  );
}
