import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Link2, Pencil, Users } from "lucide-react";
import type { ApiError } from "@/core/api/types";
import { isAdminRole } from "@/core/api/types";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import type {
  CreateDirectoryParentInput,
  DirectoryParent,
  GrantTeacherRoleInput,
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
  DirectoryRowOverflowMenu,
  DirectoryTable,
  DirectoryTableHead,
  DirectoryTd,
  DirectoryTh,
  directorySelectClassName,
} from "@/features/directory/presentation/components/DirectoryListChrome";
import { DirectoryPagination } from "@/features/directory/presentation/components/DirectoryPagination";
import { GrantCoordinatorRoleDialog } from "@/features/directory/presentation/components/GrantCoordinatorRoleDialog";
import { GrantTeacherRoleDialog } from "@/features/directory/presentation/components/GrantTeacherRoleDialog";
import { LinkStudentDialog } from "@/features/directory/presentation/components/LinkStudentDialog";
import { ManageLinkedStudentsDialog } from "@/features/directory/presentation/components/ManageLinkedStudentsDialog";
import { ParentFormDialog } from "@/features/directory/presentation/components/ParentFormDialog";
import { RemoveDirectoryRoleDialog } from "@/features/directory/presentation/components/RemoveDirectoryRoleDialog";
import {
  useActivateParentMutation,
  useBulkDeactivateParentsMutation,
  useCreateParentMutation,
  useDeactivateParentMutation,
  useDirectoryCampusesQuery,
  useDirectoryParentsQuery,
  useDirectorySchoolsQuery,
  useGrantCoordinatorRoleToParentMutation,
  useGrantTeacherRoleToParentMutation,
  useGrantTutorRoleToParentMutation,
  useLinkParentStudentMutation,
  useRemoveDirectoryRoleMutation,
  useUnlinkParentStudentMutation,
  useUpdateParentMutation,
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

type LinkedStudentsFilter = "all" | "linked" | "unlinked";

function formatChildren(parent: DirectoryParent): string {
  const count = parent.linkedStudentCount;
  if (count === 0) {
    return "No children attached";
  }
  return `${count} ${count === 1 ? "child" : "children"}`;
}

/** Paginated parent directory with account and child link management. */
export function DirectoryParentsPage() {
  const { user } = useAuth();
  const canManage = user?.role === "PortalAdmin";
  const canView = user != null && isAdminRole(user.role);
  const isPortalAdmin = user?.role === "PortalAdmin";
  const isSchoolAdmin = user?.role === "SchoolAdmin";
  const lockedSchoolId =
    isSchoolAdmin && user?.schoolId != null ? user.schoolId : null;
  const showSchoolFilter = isPortalAdmin;
  const showCampusFilter = isPortalAdmin || isSchoolAdmin;

  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [schoolId, setSchoolId] = useState(
    lockedSchoolId != null ? String(lockedSchoolId) : "",
  );
  const [campusId, setCampusId] = useState("");
  const [linkedFilter, setLinkedFilter] =
    useState<LinkedStudentsFilter>("all");
  const [activeFilter, setActiveFilter] =
    useState<DirectoryAccountStatusFilter>("all");
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [parentDialog, setParentDialog] = useState<
    "create" | DirectoryParent | null
  >(null);
  const [grantTeacherTarget, setGrantTeacherTarget] =
    useState<DirectoryParent | null>(null);
  const [grantCoordinatorTarget, setGrantCoordinatorTarget] =
    useState<DirectoryParent | null>(null);
  const [grantTutorTarget, setGrantTutorTarget] =
    useState<DirectoryParent | null>(null);
  const [deactivateTarget, setDeactivateTarget] =
    useState<DirectoryParent | null>(null);
  const [bulkDeactivateOpen, setBulkDeactivateOpen] = useState(false);
  const [removeRoleTarget, setRemoveRoleTarget] = useState<{
    parentId: number;
    fullName: string;
    role: DirectoryCombinableRole;
  } | null>(null);
  const [manageChildrenTarget, setManageChildrenTarget] =
    useState<DirectoryParent | null>(null);
  const [linkStudentTarget, setLinkStudentTarget] =
    useState<DirectoryParent | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedSchoolId =
    lockedSchoolId ?? (Number(schoolId) || null);
  const selectedCampusId = Number(campusId) || null;

  const { data: schools = [] } = useDirectorySchoolsQuery(canView);
  const { data: campuses = [] } = useDirectoryCampusesQuery(
    selectedSchoolId ?? 0,
    canView && showCampusFilter && selectedSchoolId != null,
  );

  const filters = useMemo(
    () => ({
      search: search || undefined,
      schoolId: selectedSchoolId,
      campusId: selectedCampusId,
      hasLinkedStudents:
        linkedFilter === "all"
          ? null
          : linkedFilter === "linked",
      pageNumber,
      pageSize: PAGE_SIZE,
    }),
    [
      search,
      selectedSchoolId,
      selectedCampusId,
      linkedFilter,
      pageNumber,
    ],
  );

  const { data, isLoading, error, refetch, isFetching } =
    useDirectoryParentsQuery(filters);

  const createMutation = useCreateParentMutation();
  const updateMutation = useUpdateParentMutation();
  const activateMutation = useActivateParentMutation();
  const deactivateMutation = useDeactivateParentMutation();
  const bulkDeactivateMutation = useBulkDeactivateParentsMutation();
  const grantTeacherMutation = useGrantTeacherRoleToParentMutation();
  const grantCoordinatorMutation = useGrantCoordinatorRoleToParentMutation();
  const grantTutorMutation = useGrantTutorRoleToParentMutation();
  const removeRoleMutation = useRemoveDirectoryRoleMutation();
  const linkStudentMutation = useLinkParentStudentMutation();
  const unlinkStudentMutation = useUnlinkParentStudentMutation();

  const totalCount = data?.totalCount ?? 0;

  const visibleParents = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter((parent) =>
      matchesDirectoryAccountStatusFilter(
        parent.accountStatus,
        parent.isActive,
        activeFilter,
      ),
    );
  }, [data?.items, activeFilter]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [pageNumber, search, schoolId, campusId, linkedFilter, activeFilter]);

  useEffect(() => {
    if (lockedSchoolId != null) {
      return;
    }
    setCampusId("");
    setPageNumber(1);
  }, [schoolId, lockedSchoolId]);

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    activateMutation.isPending ||
    deactivateMutation.isPending ||
    bulkDeactivateMutation.isPending ||
    grantTeacherMutation.isPending ||
    grantCoordinatorMutation.isPending ||
    grantTutorMutation.isPending ||
    removeRoleMutation.isPending ||
    linkStudentMutation.isPending ||
    unlinkStudentMutation.isPending;

  const allVisibleSelected =
    visibleParents.length > 0 &&
    visibleParents.every((parent) => selectedIds.has(parent.parentId));

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
    if (parent.isActive) {
      setDeactivateTarget(parent);
      return;
    }

    try {
      await activateMutation.mutateAsync(parent.parentId);
      setSuccessMessage(`Activated ${parent.fullName}.`);
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(apiError.message ?? "Unable to update parent status.");
    }
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) {
      return;
    }

    clearMessages();
    try {
      await deactivateMutation.mutateAsync(deactivateTarget.parentId);
      setSuccessMessage(`Deactivated ${deactivateTarget.fullName}.`);
      setDeactivateTarget(null);
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(apiError.message ?? "Unable to update parent status.");
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
      setSuccessMessage(`Deactivated ${result.affectedCount} parent(s).`);
      setSelectedIds(new Set());
      setBulkDeactivateOpen(false);
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(apiError.message ?? "Unable to bulk deactivate parents.");
    }
  }

  function rowActions(parent: DirectoryParent) {
    if (canManage) {
      const roles = parent.roles ?? [];
      const hasTeacherRole = roles.includes("Teacher");
      const hasCoordinatorRole = roles.includes("Coordinator");
      const hasTutorRole = roles.includes("Tutor");
      const removableRoles = getRemovableDirectoryRoles(roles, "Parent");
      const overflowItems = [
        {
          id: "toggle-active",
          label: parent.isActive ? "Deactivate" : "Activate",
          onSelect: () => void toggleActive(parent),
          disabled: busy,
          tone: parent.isActive ? ("danger" as const) : ("default" as const),
        },
        ...(!hasTeacherRole
          ? [
              {
                id: "add-teacher",
                label: "Add Teacher role",
                onSelect: () => {
                  clearMessages();
                  setGrantTeacherTarget(parent);
                },
                disabled: busy,
              },
            ]
          : []),
        ...(!hasCoordinatorRole
          ? [
              {
                id: "add-coordinator",
                label: "Add Coordinator role",
                onSelect: () => {
                  clearMessages();
                  setGrantCoordinatorTarget(parent);
                },
                disabled: busy,
              },
            ]
          : []),
        ...(!hasTutorRole
          ? [
              {
                id: "add-tutor",
                label: "Add Tutor role",
                onSelect: () => {
                  clearMessages();
                  setGrantTutorTarget(parent);
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
              parentId: parent.parentId,
              fullName: parent.fullName,
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
            icon={Link2}
            label={`Link student to ${parent.fullName}`}
            disabled={busy}
            onClick={() => {
              clearMessages();
              setLinkStudentTarget(parent);
            }}
          />
          <DirectoryIconAction
            icon={Users}
            label={`Manage children for ${parent.fullName}`}
            disabled={busy}
            onClick={() => {
              clearMessages();
              setManageChildrenTarget(parent);
            }}
          />
          <DirectoryIconAction
            icon={Pencil}
            label={`Edit ${parent.fullName}`}
            disabled={busy}
            onClick={() => {
              clearMessages();
              setParentDialog(parent);
            }}
          />
          <DirectoryRowOverflowMenu
            label={`More actions for ${parent.fullName}`}
            disabled={busy}
            items={overflowItems}
          />
        </>
      );
    }

    if (!canView) {
      return null;
    }

    return (
      <DirectoryIconAction
        icon={Users}
        label={`View linked students for ${parent.fullName}`}
        onClick={() => {
          clearMessages();
          setManageChildrenTarget(parent);
        }}
      />
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
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5">
          <AppSearchInput
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                applyFilters();
              }
            }}
            placeholder="Search by name, username, mobile, or CNIC…"
            containerClassName="min-w-[14rem] flex-1"
          />
          {showSchoolFilter ? (
            <select
              value={schoolId}
              onChange={(event) => setSchoolId(event.target.value)}
              className={cn(directorySelectClassName, "w-36 shrink-0")}
              aria-label="Filter by linked student's school"
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
              aria-label="Filter by linked student's campus"
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
            value={linkedFilter}
            onChange={(event) => {
              setLinkedFilter(event.target.value as LinkedStudentsFilter);
              setPageNumber(1);
            }}
            className={cn(directorySelectClassName, "w-40 shrink-0")}
            aria-label="Filter by children"
          >
            <option value="all">All children</option>
            <option value="linked">Has children</option>
            <option value="unlinked">No children</option>
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
              subtitle={
                (parent.roles?.length ?? 0) > 1
                  ? `${parent.username} · ${parent.roles?.join(", ")}`
                  : parent.username
              }
              badge={
                <AccountStatusBadge
                  accountStatus={parent.accountStatus}
                  isActive={parent.isActive}
                />
              }
              meta={<p>{formatChildren(parent)}</p>}
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
            <DirectoryTh>Contact</DirectoryTh>
            <DirectoryTh>Children</DirectoryTh>
            <DirectoryTh>Status</DirectoryTh>
            {canView ? <DirectoryTh align="right">Actions</DirectoryTh> : null}
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
                    {parent.username}
                  </p>
                  {(parent.roles?.length ?? 0) > 1 ? (
                    <p className="mt-0.5 text-xs font-medium text-primary">
                      Roles: {parent.roles?.join(", ")}
                    </p>
                  ) : null}
                </DirectoryTd>
                <DirectoryTd className="text-muted-foreground">
                  <p>{parent.mobileNumber || "—"}</p>
                  {parent.cnic ? (
                    <p className="text-xs">{parent.cnic}</p>
                  ) : null}
                </DirectoryTd>
                <DirectoryTd>
                  <p>{parent.linkedStudentCount}</p>
                </DirectoryTd>
                <DirectoryTd>
                  <AccountStatusBadge
                    accountStatus={parent.accountStatus}
                    isActive={parent.isActive}
                  />
                </DirectoryTd>
                {canView ? (
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

      {grantTeacherTarget ? (
        <GrantTeacherRoleDialog
          person={grantTeacherTarget}
          schools={schools}
          isSubmitting={grantTeacherMutation.isPending}
          onClose={() => setGrantTeacherTarget(null)}
          onSubmit={async (input: GrantTeacherRoleInput) => {
            await grantTeacherMutation.mutateAsync({
              parentId: grantTeacherTarget.parentId,
              input,
            });
            setSuccessMessage(
              `Teacher role added to ${grantTeacherTarget.fullName}.`,
            );
            setGrantTeacherTarget(null);
          }}
        />
      ) : null}

      {grantCoordinatorTarget ? (
        <GrantCoordinatorRoleDialog
          person={grantCoordinatorTarget}
          schools={schools}
          isSubmitting={grantCoordinatorMutation.isPending}
          onClose={() => setGrantCoordinatorTarget(null)}
          onSubmit={async (input) => {
            if (!("schoolId" in input)) {
              return;
            }
            clearMessages();
            try {
              await grantCoordinatorMutation.mutateAsync({
                parentId: grantCoordinatorTarget.parentId,
                input,
              });
              setSuccessMessage(
                `Coordinator role added to ${grantCoordinatorTarget.fullName}.`,
              );
              setGrantCoordinatorTarget(null);
            } catch (err) {
              const apiError = err as ApiError;
              setActionError(
                apiError.message ?? "Unable to add Coordinator role.",
              );
              throw err;
            }
          }}
        />
      ) : null}

      <AppConfirmDialog
        open={grantTutorTarget != null}
        onOpenChange={(open) => {
          if (!open && !grantTutorMutation.isPending) {
            setGrantTutorTarget(null);
          }
        }}
        title="Add Tutor role"
        description={
          grantTutorTarget
            ? `Add the Tutor role to ${grantTutorTarget.fullName}? They keep Parent access and can switch to Tutor after login.`
            : ""
        }
        confirmLabel="Add Tutor"
        loading={grantTutorMutation.isPending}
        onConfirm={() => {
          void (async () => {
            if (!grantTutorTarget) {
              return;
            }
            try {
              await grantTutorMutation.mutateAsync(grantTutorTarget.parentId);
              setSuccessMessage(
                `Tutor role added to ${grantTutorTarget.fullName}.`,
              );
              setGrantTutorTarget(null);
            } catch (err) {
              const apiError = err as ApiError;
              setActionError(apiError.message ?? "Unable to add Tutor role.");
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
        title="Deactivate parent"
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
        title="Bulk deactivate parents"
        description={`Deactivate ${selectedIds.size} selected parent${selectedIds.size === 1 ? "" : "s"}? They will not be able to sign in until activated again.`}
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
                context: "parents",
                userId: removeRoleTarget.parentId,
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

      {manageChildrenTarget ? (
        <ManageLinkedStudentsDialog
          parentName={manageChildrenTarget.fullName}
          title="Linked students"
          description={
            canManage
              ? `Students linked to ${manageChildrenTarget.fullName}.`
              : `Students at your school linked to ${manageChildrenTarget.fullName}.`
          }
          linkedStudents={manageChildrenTarget.linkedStudents ?? []}
          isSubmitting={canManage && unlinkStudentMutation.isPending}
          readOnly={!canManage}
          onClose={() => setManageChildrenTarget(null)}
          onUnlink={
            canManage
              ? async (studentId, studentName) => {
                  await unlinkStudentMutation.mutateAsync({
                    parentId: manageChildrenTarget.parentId,
                    studentId,
                  });
                  setSuccessMessage(
                    `Unlinked ${studentName} from ${manageChildrenTarget.fullName}.`,
                  );
                  setManageChildrenTarget((current) =>
                    current
                      ? {
                          ...current,
                          linkedStudents: (current.linkedStudents ?? []).filter(
                            (student) => student.studentId !== studentId,
                          ),
                          linkedStudentCount: Math.max(
                            0,
                            current.linkedStudentCount - 1,
                          ),
                          linkedStudentNames: (
                            current.linkedStudentNames ?? []
                          ).filter((name) => name !== studentName),
                        }
                      : current,
                  );
                  void refetch();
                }
              : undefined
          }
          onAddLink={
            canManage
              ? () => {
                  const parent = manageChildrenTarget;
                  setManageChildrenTarget(null);
                  setLinkStudentTarget(parent);
                }
              : undefined
          }
        />
      ) : null}

      {linkStudentTarget ? (
        <LinkStudentDialog
          parentName={linkStudentTarget.fullName}
          isSubmitting={linkStudentMutation.isPending}
          onClose={() => setLinkStudentTarget(null)}
          onSubmit={async (studentId, relationship) => {
            await linkStudentMutation.mutateAsync({
              parentId: linkStudentTarget.parentId,
              input: { studentId, relationship },
            });
            setSuccessMessage(
              `Linked student #${studentId} to ${linkStudentTarget.fullName}.`,
            );
            setLinkStudentTarget(null);
            void refetch();
          }}
        />
      ) : null}
    </DirectoryPageShell>
  );
}
