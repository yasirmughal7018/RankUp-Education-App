import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pencil, UserCheck, Users, UserX } from "lucide-react";
import type { ApiError } from "@/core/api/types";
import { isAdminRole } from "@/core/api/types";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import type {
  CreateDirectoryStudentInput,
  DirectoryStudent,
  UpdateDirectoryStudentInput,
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
import { StudentAssignedPeopleDialog } from "@/features/directory/presentation/components/StudentAssignedPeopleDialog";
import { StudentFormDialog } from "@/features/directory/presentation/components/StudentFormDialog";
import {
  useActivateStudentMutation,
  useBulkDeactivateStudentsMutation,
  useCreateStudentMutation,
  useDeactivateStudentMutation,
  useDirectoryCampusesQuery,
  useDirectorySchoolsQuery,
  useDirectoryStudentsQuery,
  useUpdateStudentMutation,
} from "@/features/directory/presentation/hooks/useDirectoryQueries";
import {
  DIRECTORY_ACCOUNT_STATUS_FILTER_OPTIONS,
  matchesDirectoryAccountStatusFilter,
  type DirectoryAccountStatusFilter,
} from "@/features/directory/presentation/utils/accountStatus";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

/** Paginated student directory with filters, bulk actions, and create/edit dialog. */
export function DirectoryStudentsPage() {
  const { user } = useAuth();
  const canManage = user != null && isAdminRole(user.role);
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [schoolId, setSchoolId] = useState("");
  const [campusId, setCampusId] = useState("");
  const [grade, setGrade] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<DirectoryAccountStatusFilter>("all");
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [studentDialog, setStudentDialog] = useState<
    "create" | DirectoryStudent | null
  >(null);
  const [assignedPeopleTarget, setAssignedPeopleTarget] =
    useState<DirectoryStudent | null>(null);
  const [deactivateTarget, setDeactivateTarget] =
    useState<DirectoryStudent | null>(null);
  const [bulkDeactivateOpen, setBulkDeactivateOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedSchoolId = Number(schoolId) || null;
  const selectedCampusId = Number(campusId) || null;
  const selectedGrade = Number(grade) || null;

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
      grade: selectedGrade,
      pageNumber,
      pageSize: PAGE_SIZE,
    }),
    [search, selectedSchoolId, selectedCampusId, selectedGrade, pageNumber],
  );

  const { data, isLoading, error, refetch, isFetching } =
    useDirectoryStudentsQuery(filters);

  const createMutation = useCreateStudentMutation();
  const updateMutation = useUpdateStudentMutation();
  const activateMutation = useActivateStudentMutation();
  const deactivateMutation = useDeactivateStudentMutation();
  const bulkDeactivateMutation = useBulkDeactivateStudentsMutation();

  const totalCount = data?.totalCount ?? 0;

  const visibleStudents = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter((student) =>
      matchesDirectoryAccountStatusFilter(
        student.accountStatus,
        student.isActive,
        activeFilter,
      ),
    );
  }, [data?.items, activeFilter]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [pageNumber, search, schoolId, campusId, grade, activeFilter]);

  useEffect(() => {
    setCampusId("");
    setPageNumber(1);
  }, [schoolId]);

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    activateMutation.isPending ||
    deactivateMutation.isPending ||
    bulkDeactivateMutation.isPending;

  const allVisibleSelected =
    visibleStudents.length > 0 &&
    visibleStudents.every((student) => selectedIds.has(student.studentId));

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
    setSelectedIds(new Set(visibleStudents.map((s) => s.studentId)));
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
    input: CreateDirectoryStudentInput | UpdateDirectoryStudentInput;
  }) {
    clearMessages();
    if (payload.mode === "create") {
      const created = await createMutation.mutateAsync(
        payload.input as CreateDirectoryStudentInput,
      );
      setSuccessMessage(
        `Created student ${created.fullName}. User must set password on first login.`,
      );
    } else if (studentDialog && studentDialog !== "create") {
      await updateMutation.mutateAsync({
        studentId: studentDialog.studentId,
        input: payload.input as UpdateDirectoryStudentInput,
      });
      setSuccessMessage(`Updated student ${payload.input.fullName}.`);
    }
    setStudentDialog(null);
  }

  async function toggleActive(student: DirectoryStudent) {
    clearMessages();
    if (student.isActive) {
      setDeactivateTarget(student);
      return;
    }
    try {
      await activateMutation.mutateAsync(student.studentId);
      setSuccessMessage(`Activated ${student.fullName}.`);
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(apiError.message ?? "Unable to update student status.");
    }
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) {
      return;
    }
    clearMessages();
    try {
      await deactivateMutation.mutateAsync(deactivateTarget.studentId);
      setSuccessMessage(`Deactivated ${deactivateTarget.fullName}.`);
      setDeactivateTarget(null);
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(apiError.message ?? "Unable to update student status.");
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
      setSuccessMessage(`Deactivated ${result.affectedCount} student(s).`);
      setSelectedIds(new Set());
      setBulkDeactivateOpen(false);
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(apiError.message ?? "Unable to bulk deactivate students.");
    }
  }

  function rowActions(student: DirectoryStudent) {
    if (!canManage) {
      return null;
    }
    return (
      <>
        <DirectoryIconAction
          icon={Users}
          label={`View assigned people for ${student.fullName}`}
          disabled={busy}
          onClick={() => {
            clearMessages();
            setAssignedPeopleTarget(student);
          }}
        />
        <DirectoryIconAction
          icon={Pencil}
          label={`Edit ${student.fullName}`}
          disabled={busy}
          onClick={() => {
            clearMessages();
            setStudentDialog(student);
          }}
        />
        <DirectoryIconAction
          icon={student.isActive ? UserX : UserCheck}
          label={
            student.isActive
              ? `Deactivate ${student.fullName}`
              : `Activate ${student.fullName}`
          }
          disabled={busy}
          onClick={() => void toggleActive(student)}
        />
      </>
    );
  }

  return (
    <DirectoryPageShell
      title="Students"
      primaryAction={
        canManage ? (
          <Button
            type="button"
            size="sm"
            className="h-9 whitespace-nowrap"
            onClick={() => {
              clearMessages();
              setStudentDialog("create");
            }}
          >
            Create student
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
            placeholder="Search students..."
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
          <input
            type="number"
            min={1}
            value={grade}
            onChange={(event) => {
              setGrade(event.target.value);
              setPageNumber(1);
            }}
            placeholder="Grade"
            className={cn(FORM_FIELD_CLASS, "h-11 lg:w-24")}
            aria-label="Filter by grade"
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
          onClick={() => {
            clearMessages();
            setBulkDeactivateOpen(true);
          }}
        >
          Bulk deactivate
        </Button>
      </DirectoryBulkBar>

      <DirectoryListPanel
        loading={isLoading}
        empty={visibleStudents.length === 0}
        emptyTitle="No students found"
        emptyDescription="Try a different search or clear filters."
        emptyActionLabel={canManage ? "Create student" : undefined}
        onEmptyAction={
          canManage
            ? () => {
                clearMessages();
                setStudentDialog("create");
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
          {visibleStudents.map((student) => (
            <DirectoryEntityCard
              key={student.studentId}
              selected={selectedIds.has(student.studentId)}
              onSelect={
                canManage ? () => toggleSelect(student.studentId) : undefined
              }
              title={student.fullName}
              subtitle={student.username}
              badge={
                <AccountStatusBadge
                  accountStatus={student.accountStatus}
                  isActive={student.isActive}
                />
              }
              meta={
                <>
                  <p>
                    Roll {student.rollNumber} · Grade {student.grade}
                    {student.section}
                  </p>
                  <p>{student.schoolName || "—"}</p>
                  <p>{student.campusName || "—"}</p>
                </>
              }
              actions={rowActions(student)}
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
                  aria-label="Select all students on this page"
                  className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                />
              </DirectoryTh>
            ) : null}
            <DirectoryTh>Name</DirectoryTh>
            <DirectoryTh>Roll</DirectoryTh>
            <DirectoryTh>Grade</DirectoryTh>
            <DirectoryTh>School / Campus</DirectoryTh>
            <DirectoryTh>Status</DirectoryTh>
            {canManage ? <DirectoryTh align="right">Actions</DirectoryTh> : null}
          </DirectoryTableHead>
          <tbody className="divide-y divide-border">
            {visibleStudents.map((student) => (
              <tr
                key={student.studentId}
                className="transition hover:bg-muted/40"
              >
                {canManage ? (
                  <DirectoryTd>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(student.studentId)}
                      onChange={() => toggleSelect(student.studentId)}
                      aria-label={`Select ${student.fullName}`}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                    />
                  </DirectoryTd>
                ) : null}
                <DirectoryTd>
                  <p className="font-medium">{student.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {student.username}
                  </p>
                </DirectoryTd>
                <DirectoryTd>{student.rollNumber}</DirectoryTd>
                <DirectoryTd>
                  {student.grade}
                  {student.section}
                </DirectoryTd>
                <DirectoryTd className="text-muted-foreground">
                  <p>{student.schoolName || "—"}</p>
                  <p className="text-xs">{student.campusName || "—"}</p>
                </DirectoryTd>
                <DirectoryTd>
                  <AccountStatusBadge
                    accountStatus={student.accountStatus}
                    isActive={student.isActive}
                  />
                </DirectoryTd>
                {canManage ? (
                  <DirectoryTd align="right">
                    <div className="flex justify-end gap-2">
                      {rowActions(student)}
                    </div>
                  </DirectoryTd>
                ) : null}
              </tr>
            ))}
          </tbody>
        </DirectoryTable>
      </DirectoryListPanel>

      {studentDialog ? (
        <StudentFormDialog
          student={studentDialog === "create" ? null : studentDialog}
          schools={schools}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          onClose={() => setStudentDialog(null)}
          onSubmit={handleFormSubmit}
        />
      ) : null}

      {assignedPeopleTarget ? (
        <StudentAssignedPeopleDialog
          studentName={assignedPeopleTarget.fullName}
          teachers={assignedPeopleTarget.teacherNames ?? []}
          parents={assignedPeopleTarget.parentNames ?? []}
          tutors={assignedPeopleTarget.tutorNames ?? []}
          onClose={() => setAssignedPeopleTarget(null)}
        />
      ) : null}

      <AppConfirmDialog
        open={deactivateTarget != null}
        onOpenChange={(open) => {
          if (!open && !deactivateMutation.isPending) {
            setDeactivateTarget(null);
          }
        }}
        title="Deactivate student"
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
        title="Bulk deactivate students"
        description={`Deactivate ${selectedIds.size} selected student${selectedIds.size === 1 ? "" : "s"}? They will not be able to sign in until activated again.`}
        confirmLabel="Deactivate"
        destructive
        loading={bulkDeactivateMutation.isPending}
        onConfirm={() => void confirmBulkDeactivate()}
      />
    </DirectoryPageShell>
  );
}
