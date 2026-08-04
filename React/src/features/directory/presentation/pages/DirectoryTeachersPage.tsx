import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pencil, UserCheck, UserPlus, UserX } from "lucide-react";
import type { ApiError } from "@/core/api/types";
import { isAdminRole } from "@/core/api/types";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import type {
  CreateDirectoryTeacherInput,
  DirectoryTeacher,
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
  DirectoryTable,
  DirectoryTableHead,
  DirectoryTd,
  DirectoryTh,
  directorySelectClassName,
} from "@/features/directory/presentation/components/DirectoryListChrome";
import { DirectoryPagination } from "@/features/directory/presentation/components/DirectoryPagination";
import { TeacherFormDialog } from "@/features/directory/presentation/components/TeacherFormDialog";
import {
  useActivateTeacherMutation,
  useBulkDeactivateTeachersMutation,
  useCreateTeacherMutation,
  useDeactivateTeacherMutation,
  useDirectoryCampusesQuery,
  useDirectorySchoolsQuery,
  useDirectoryTeachersQuery,
  useGrantParentRoleToTeacherMutation,
  useUpdateTeacherMutation,
} from "@/features/directory/presentation/hooks/useDirectoryQueries";
import {
  DIRECTORY_ACCOUNT_STATUS_FILTER_OPTIONS,
  matchesDirectoryAccountStatusFilter,
  type DirectoryAccountStatusFilter,
} from "@/features/directory/presentation/utils/accountStatus";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

/** Paginated teacher directory with school/campus filters and CRUD actions. */
export function DirectoryTeachersPage() {
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
  const [teacherDialog, setTeacherDialog] = useState<
    "create" | DirectoryTeacher | null
  >(null);
  const [grantParentTarget, setGrantParentTarget] =
    useState<DirectoryTeacher | null>(null);
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
    useDirectoryTeachersQuery(filters);

  const createMutation = useCreateTeacherMutation();
  const updateMutation = useUpdateTeacherMutation();
  const activateMutation = useActivateTeacherMutation();
  const deactivateMutation = useDeactivateTeacherMutation();
  const bulkDeactivateMutation = useBulkDeactivateTeachersMutation();
  const grantParentMutation = useGrantParentRoleToTeacherMutation();

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
    grantParentMutation.isPending;

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
    try {
      if (teacher.isActive) {
        if (!window.confirm(`Deactivate ${teacher.fullName}?`)) {
          return;
        }
        await deactivateMutation.mutateAsync(teacher.teacherId);
        setSuccessMessage(`Deactivated ${teacher.fullName}.`);
      } else {
        await activateMutation.mutateAsync(teacher.teacherId);
        setSuccessMessage(`Activated ${teacher.fullName}.`);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(apiError.message ?? "Unable to update teacher status.");
    }
  }

  async function handleBulkDeactivate() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      return;
    }
    if (
      !window.confirm(
        `Deactivate ${ids.length} selected teacher${ids.length === 1 ? "" : "s"}?`,
      )
    ) {
      return;
    }

    clearMessages();
    try {
      const result = await bulkDeactivateMutation.mutateAsync(ids);
      setSuccessMessage(`Deactivated ${result.affectedCount} teacher(s).`);
      setSelectedIds(new Set());
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(apiError.message ?? "Unable to bulk deactivate teachers.");
    }
  }

  function rowActions(teacher: DirectoryTeacher) {
    if (!canManage) {
      return null;
    }
    const hasParentRole = (teacher.roles ?? []).includes("Parent");
    return (
      <>
        <DirectoryIconAction
          icon={Pencil}
          label={`Edit ${teacher.fullName}`}
          disabled={busy}
          onClick={() => {
            clearMessages();
            setTeacherDialog(teacher);
          }}
        />
        {!hasParentRole ? (
          <DirectoryIconAction
            icon={UserPlus}
            label={`Add Parent role to ${teacher.fullName}`}
            disabled={busy}
            onClick={() => {
              clearMessages();
              setGrantParentTarget(teacher);
            }}
          />
        ) : null}
        <DirectoryIconAction
          icon={teacher.isActive ? UserX : UserCheck}
          label={
            teacher.isActive
              ? `Deactivate ${teacher.fullName}`
              : `Activate ${teacher.fullName}`
          }
          disabled={busy}
          onClick={() => void toggleActive(teacher)}
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
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <AppSearchInput
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                applyFilters();
              }
            }}
            placeholder="Search teachers..."
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
              subtitle={
                (teacher.roles?.length ?? 0) > 1
                  ? `${teacher.username} · ${teacher.roles?.join(", ")}`
                  : teacher.username
              }
              badge={
                <AccountStatusBadge
                  accountStatus={teacher.accountStatus}
                  isActive={teacher.isActive}
                />
              }
              meta={
                <>
                  <p>Code {teacher.teacherCode}</p>
                  <p>
                    {teacher.schoolName} · {teacher.campusName}
                  </p>
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
            <DirectoryTh>Status</DirectoryTh>
            {canManage ? <DirectoryTh align="right">Actions</DirectoryTh> : null}
          </DirectoryTableHead>
          <tbody className="divide-y divide-border">
            {visibleTeachers.map((teacher) => (
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
                  {(teacher.roles?.length ?? 0) > 1 ? (
                    <p className="mt-0.5 text-xs font-medium text-primary">
                      Roles: {teacher.roles?.join(", ")}
                    </p>
                  ) : null}
                </DirectoryTd>
                <DirectoryTd>{teacher.teacherCode}</DirectoryTd>
                <DirectoryTd className="text-muted-foreground">
                  {teacher.schoolName} / {teacher.campusName}
                </DirectoryTd>
                <DirectoryTd>
                  <AccountStatusBadge
                    accountStatus={teacher.accountStatus}
                    isActive={teacher.isActive}
                  />
                </DirectoryTd>
                {canManage ? (
                  <DirectoryTd align="right">
                    <div className="flex justify-end gap-2">
                      {rowActions(teacher)}
                    </div>
                  </DirectoryTd>
                ) : null}
              </tr>
            ))}
          </tbody>
        </DirectoryTable>
      </DirectoryListPanel>

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
            ? `Add the Parent role to ${grantParentTarget.fullName}? They will keep Teacher access and can switch roles after login. Students cannot combine roles.`
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
    </DirectoryPageShell>
  );
}
