import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pencil, Users } from "lucide-react";
import type { ApiError } from "@/core/api/types";
import { isAdminRole } from "@/core/api/types";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import type {
  CreateDirectoryTeacherInput,
  DirectoryLinkedStudentSummary,
  DirectoryTeacher,
  GrantTeacherCoordinatorRoleInput,
  UpdateDirectoryTeacherInput,
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
import { ManageLinkedStudentsDialog } from "@/features/directory/presentation/components/ManageLinkedStudentsDialog";
import { RemoveDirectoryRoleDialog } from "@/features/directory/presentation/components/RemoveDirectoryRoleDialog";
import { TeacherFormDialog } from "@/features/directory/presentation/components/TeacherFormDialog";
import {
  useActivateTeacherMutation,
  useBulkDeactivateTeachersMutation,
  useCreateTeacherMutation,
  useDeactivateTeacherMutation,
  useDirectoryCampusesQuery,
  useDirectorySchoolsQuery,
  useDirectoryTeachersQuery,
  useGrantCoordinatorRoleToTeacherMutation,
  useGrantParentRoleToTeacherMutation,
  useGrantTutorRoleToTeacherMutation,
  useRemoveDirectoryRoleMutation,
  useUpdateTeacherMutation,
} from "@/features/directory/presentation/hooks/useDirectoryQueries";
import {
  DIRECTORY_ACCOUNT_STATUS_FILTER_OPTIONS,
  matchesDirectoryAccountStatusFilter,
  type DirectoryAccountStatusFilter,
} from "@/features/directory/presentation/utils/accountStatus";
import {
  formatDirectoryListDisplayRoles,
  getRemovableDirectoryRoles,
  type DirectoryCombinableRole,
} from "@/features/directory/presentation/utils/directoryRoles";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

type StudentsFilter = "all" | "withStudents" | "noStudents";

function formatStudents(teacher: DirectoryTeacher): string {
  return String(teacher.studentCount ?? 0);
}

/** Paginated teacher directory with school/campus filters and CRUD actions. */
export function DirectoryTeachersPage() {
  const { user } = useAuth();
  const canManage = user != null && isAdminRole(user.role);
  const isPortalAdmin = user?.role === "PortalAdmin";
  const canGrantParentRole = isPortalAdmin;
  const canGrantTutorRole = isPortalAdmin;
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
  const [studentsFilter, setStudentsFilter] = useState<StudentsFilter>("all");
  const [activeFilter, setActiveFilter] =
    useState<DirectoryAccountStatusFilter>("all");
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [teacherDialog, setTeacherDialog] = useState<
    "create" | DirectoryTeacher | null
  >(null);
  const [grantParentTarget, setGrantParentTarget] =
    useState<DirectoryTeacher | null>(null);
  const [grantCoordinatorTarget, setGrantCoordinatorTarget] =
    useState<DirectoryTeacher | null>(null);
  const [grantTutorTarget, setGrantTutorTarget] =
    useState<DirectoryTeacher | null>(null);
  const [deactivateTarget, setDeactivateTarget] =
    useState<DirectoryTeacher | null>(null);
  const [bulkDeactivateOpen, setBulkDeactivateOpen] = useState(false);
  const [removeRoleTarget, setRemoveRoleTarget] = useState<{
    teacherId: number;
    fullName: string;
    role: DirectoryCombinableRole;
  } | null>(null);
  const [viewStudentsTarget, setViewStudentsTarget] = useState<{
    name: string;
    students: DirectoryLinkedStudentSummary[];
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedSchoolId =
    lockedSchoolId ?? (Number(schoolId) || null);
  const selectedCampusId =
    lockedCampusId ?? (Number(campusId) || null);

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
      hasStudents:
        studentsFilter === "all"
          ? null
          : studentsFilter === "withStudents",
      pageNumber,
      pageSize: PAGE_SIZE,
    }),
    [
      search,
      selectedSchoolId,
      selectedCampusId,
      studentsFilter,
      pageNumber,
    ],
  );

  const { data, isLoading, error, refetch, isFetching } =
    useDirectoryTeachersQuery(filters);

  const createMutation = useCreateTeacherMutation();
  const updateMutation = useUpdateTeacherMutation();
  const activateMutation = useActivateTeacherMutation();
  const deactivateMutation = useDeactivateTeacherMutation();
  const bulkDeactivateMutation = useBulkDeactivateTeachersMutation();
  const grantParentMutation = useGrantParentRoleToTeacherMutation();
  const grantCoordinatorMutation = useGrantCoordinatorRoleToTeacherMutation();
  const grantTutorMutation = useGrantTutorRoleToTeacherMutation();
  const removeRoleMutation = useRemoveDirectoryRoleMutation();

  const totalCount = data?.totalCount ?? 0;

  const visibleTeachers = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter((teacher) =>
      matchesDirectoryAccountStatusFilter(
        teacher.accountStatus,
        teacher.isActive,
        activeFilter,
      ),
    );
  }, [data?.items, activeFilter]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [
    pageNumber,
    search,
    schoolId,
    campusId,
    studentsFilter,
    activeFilter,
  ]);

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
    grantCoordinatorMutation.isPending ||
    grantTutorMutation.isPending ||
    removeRoleMutation.isPending;

  const allVisibleSelected =
    visibleTeachers.length > 0 &&
    visibleTeachers.every((teacher) => selectedIds.has(teacher.teacherId));

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
    setSelectedIds(new Set(visibleTeachers.map((t) => t.teacherId)));
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
    input: CreateDirectoryTeacherInput | UpdateDirectoryTeacherInput;
  }) {
    clearMessages();
    if (payload.mode === "create") {
      const created = await createMutation.mutateAsync(
        payload.input as CreateDirectoryTeacherInput,
      );
      setSuccessMessage(
        `Created teacher ${created.fullName}. User must set password on first login.`,
      );
    } else if (teacherDialog && teacherDialog !== "create") {
      await updateMutation.mutateAsync({
        teacherId: teacherDialog.teacherId,
        input: payload.input as UpdateDirectoryTeacherInput,
      });
      setSuccessMessage(`Updated teacher ${payload.input.fullName}.`);
    }
    setTeacherDialog(null);
  }

  async function toggleActive(teacher: DirectoryTeacher) {
    clearMessages();
    if (teacher.isActive) {
      setDeactivateTarget(teacher);
      return;
    }

    try {
      await activateMutation.mutateAsync(teacher.teacherId);
      setSuccessMessage(`Activated ${teacher.fullName}.`);
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(apiError.message ?? "Unable to update teacher status.");
    }
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) {
      return;
    }

    clearMessages();
    try {
      await deactivateMutation.mutateAsync(deactivateTarget.teacherId);
      setSuccessMessage(`Deactivated ${deactivateTarget.fullName}.`);
      setDeactivateTarget(null);
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(apiError.message ?? "Unable to update teacher status.");
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
      setSuccessMessage(`Deactivated ${result.affectedCount} teacher(s).`);
      setSelectedIds(new Set());
      setBulkDeactivateOpen(false);
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(apiError.message ?? "Unable to bulk deactivate teachers.");
    }
  }

  function rowActions(teacher: DirectoryTeacher) {
    const viewStudentsButton = (
      <DirectoryIconAction
        icon={Users}
        label={`View students for ${teacher.fullName}`}
        onClick={() => {
          setViewStudentsTarget({
            name: teacher.fullName,
            students: teacher.students ?? [],
          });
        }}
      />
    );

    if (!canManage) {
      return viewStudentsButton;
    }
    const roles = teacher.roles ?? [];
    const hasParentRole = roles.includes("Parent");
    const hasCoordinatorRole = roles.includes("Coordinator");
    const hasTutorRole = roles.includes("Tutor");
    const removableRoles = getRemovableDirectoryRoles(roles, "Teacher", {
      includeParent: canGrantParentRole,
      includeTutor: canGrantTutorRole,
    });
    const overflowItems = [
      {
        id: "toggle-active",
        label: teacher.isActive ? "Deactivate" : "Activate",
        onSelect: () => void toggleActive(teacher),
        disabled: busy,
        tone: teacher.isActive ? ("danger" as const) : ("default" as const),
      },
      ...(canGrantParentRole && !hasParentRole
        ? [
            {
              id: "add-parent",
              label: "Add Parent role",
              onSelect: () => {
                clearMessages();
                setGrantParentTarget(teacher);
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
                setGrantCoordinatorTarget(teacher);
              },
              disabled: busy,
            },
          ]
        : []),
      ...(canGrantTutorRole && !hasTutorRole
        ? [
            {
              id: "add-tutor",
              label: "Add Tutor role",
              onSelect: () => {
                clearMessages();
                setGrantTutorTarget(teacher);
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
            teacherId: teacher.teacherId,
            fullName: teacher.fullName,
            role,
          });
        },
        disabled: busy,
        tone: "danger" as const,
      })),
    ];

    return (
      <>
        {viewStudentsButton}
        <DirectoryIconAction
          icon={Pencil}
          label={`Edit ${teacher.fullName}`}
          disabled={busy}
          onClick={() => {
            clearMessages();
            setTeacherDialog(teacher);
          }}
        />
        <DirectoryRowOverflowMenu
          label={`More actions for ${teacher.fullName}`}
          disabled={busy}
          items={overflowItems}
        />
      </>
    );
  }

  return (
    <DirectoryPageShell
      title="Teachers"
      primaryAction={
        canManage ? (
          <Button
            type="button"
            size="sm"
            className="h-9 whitespace-nowrap"
            onClick={() => {
              clearMessages();
              setTeacherDialog("create");
            }}
          >
            Create teacher
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
            value={studentsFilter}
            onChange={(event) => {
              setStudentsFilter(event.target.value as StudentsFilter);
              setPageNumber(1);
            }}
            className={cn(directorySelectClassName, "w-40 shrink-0")}
            aria-label="Filter by students"
          >
            <option value="all">All students</option>
            <option value="withStudents">Has students</option>
            <option value="noStudents">No students</option>
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
        empty={visibleTeachers.length === 0}
        emptyTitle="No teachers found"
        emptyDescription="Try a different search or clear filters."
        emptyActionLabel={canManage ? "Create teacher" : undefined}
        onEmptyAction={
          canManage
            ? () => {
                clearMessages();
                setTeacherDialog("create");
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
          {visibleTeachers.map((teacher) => (
            <DirectoryEntityCard
              key={teacher.teacherId}
              selected={selectedIds.has(teacher.teacherId)}
              onSelect={
                canManage ? () => toggleSelect(teacher.teacherId) : undefined
              }
              title={teacher.fullName}
              subtitle={(() => {
                const rolesLabel = formatDirectoryListDisplayRoles(
                  teacher.roles,
                  "Teacher",
                );
                return rolesLabel
                  ? `${teacher.username} · ${rolesLabel}`
                  : teacher.username;
              })()}
              badge={
                <AccountStatusBadge
                  accountStatus={teacher.accountStatus}
                  isActive={teacher.isActive}
                />
              }
              meta={
                <>
                  <p>Code {teacher.teacherCode || "—"}</p>
                  <p>
                    {teacher.schoolName || "—"}
                    {teacher.campusName ? (
                      <>
                        <br />
                        {teacher.campusName}
                      </>
                    ) : null}
                  </p>
                  <p>{formatStudents(teacher)} students</p>
                </>
              }
              actions={rowActions(teacher)}
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
                  aria-label="Select all teachers on this page"
                  className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                />
              </DirectoryTh>
            ) : null}
            <DirectoryTh>Name</DirectoryTh>
            <DirectoryTh>Code</DirectoryTh>
            <DirectoryTh>School / Campus</DirectoryTh>
            <DirectoryTh>Students</DirectoryTh>
            <DirectoryTh>Status</DirectoryTh>
            <DirectoryTh align="right">Actions</DirectoryTh>
          </DirectoryTableHead>
          <tbody className="divide-y divide-border">
            {visibleTeachers.map((teacher) => {
              const rolesLabel = formatDirectoryListDisplayRoles(
                teacher.roles,
                "Teacher",
              );
              return (
              <tr
                key={teacher.teacherId}
                className="transition hover:bg-muted/40"
              >
                {canManage ? (
                  <DirectoryTd>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(teacher.teacherId)}
                      onChange={() => toggleSelect(teacher.teacherId)}
                      aria-label={`Select ${teacher.fullName}`}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                    />
                  </DirectoryTd>
                ) : null}
                <DirectoryTd>
                  <p className="font-medium">{teacher.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {teacher.username}
                  </p>
                  {rolesLabel ? (
                    <p className="mt-0.5 text-xs font-medium text-primary">
                      Roles: {rolesLabel}
                    </p>
                  ) : null}
                </DirectoryTd>
                <DirectoryTd>{teacher.teacherCode || "—"}</DirectoryTd>
                <DirectoryTd className="text-muted-foreground">
                  <p className="text-foreground">{teacher.schoolName || "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {teacher.campusName || "—"}
                  </p>
                </DirectoryTd>
                <DirectoryTd className="text-muted-foreground tabular-nums">
                  {formatStudents(teacher)}
                </DirectoryTd>
                <DirectoryTd>
                  <AccountStatusBadge
                    accountStatus={teacher.accountStatus}
                    isActive={teacher.isActive}
                  />
                </DirectoryTd>
                <DirectoryTd align="right">
                  <div className="flex justify-end gap-1.5">
                    {rowActions(teacher)}
                  </div>
                </DirectoryTd>
              </tr>
              );
            })}
          </tbody>
        </DirectoryTable>
      </DirectoryListPanel>

      {viewStudentsTarget ? (
        <ManageLinkedStudentsDialog
          parentName={viewStudentsTarget.name}
          title="Students"
          description={`Students studying under ${viewStudentsTarget.name}.`}
          emptyMessage="No students assigned yet."
          linkedStudents={viewStudentsTarget.students}
          isSubmitting={false}
          readOnly
          onClose={() => setViewStudentsTarget(null)}
        />
      ) : null}

      {teacherDialog ? (
        <TeacherFormDialog
          teacher={teacherDialog === "create" ? null : teacherDialog}
          schools={schools}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          onClose={() => setTeacherDialog(null)}
          onSubmit={handleFormSubmit}
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
            ? `Add the Parent role to ${grantParentTarget.fullName}? They keep Teacher access and can also hold Coordinator. Switch roles after login.`
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
              await grantParentMutation.mutateAsync(grantParentTarget.teacherId);
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

      {grantCoordinatorTarget ? (
        <GrantCoordinatorRoleDialog
          person={grantCoordinatorTarget}
          isSubmitting={grantCoordinatorMutation.isPending}
          lockSchoolCampus
          defaults={{
            schoolId: grantCoordinatorTarget.schoolId,
            campusId: grantCoordinatorTarget.campusId,
            schoolName: grantCoordinatorTarget.schoolName,
            campusName: grantCoordinatorTarget.campusName,
            coordinatorCode: grantCoordinatorTarget.teacherCode,
          }}
          onClose={() => setGrantCoordinatorTarget(null)}
          onSubmit={async (input) => {
            clearMessages();
            try {
              await grantCoordinatorMutation.mutateAsync({
                teacherId: grantCoordinatorTarget.teacherId,
                input: input as GrantTeacherCoordinatorRoleInput,
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
            ? `Add the Tutor role to ${grantTutorTarget.fullName}? They keep Teacher access and can switch to Tutor after login.`
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
              await grantTutorMutation.mutateAsync(grantTutorTarget.teacherId);
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
        title="Deactivate teacher"
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
        title="Bulk deactivate teachers"
        description={`Deactivate ${selectedIds.size} selected teacher${selectedIds.size === 1 ? "" : "s"}? They will not be able to sign in until activated again.`}
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
                context: "teachers",
                userId: removeRoleTarget.teacherId,
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
