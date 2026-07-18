import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { ApiError } from "@/core/api/types";
import { isAdminRole } from "@/core/api/types";
import { PageHeader } from "@/core/components/PageHeader";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import type {
  ActiveStatusFilter,
  CreateDirectoryTeacherInput,
  DirectoryTeacher,
  UpdateDirectoryTeacherInput,
} from "@/features/directory/domain/directoryTypes";
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
  useUpdateTeacherMutation,
} from "@/features/directory/presentation/hooks/useDirectoryQueries";

const PAGE_SIZE = 50;

export function DirectoryTeachersPage() {
  const { user } = useAuth();
  const canManage = user != null && isAdminRole(user.role);
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [schoolId, setSchoolId] = useState("");
  const [campusId, setCampusId] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveStatusFilter>("all");
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [teacherDialog, setTeacherDialog] = useState<
    "create" | DirectoryTeacher | null
  >(null);
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

  const teachers = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;

  const visibleTeachers = useMemo(() => {
    if (activeFilter === "all") {
      return teachers;
    }
    const wantActive = activeFilter === "active";
    return teachers.filter((teacher) => teacher.isActive === wantActive);
  }, [teachers, activeFilter]);

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
    bulkDeactivateMutation.isPending;

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Teachers"
        description="Search and manage teachers with school and campus filters."
        action={
          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <button
                type="button"
                onClick={() => {
                  clearMessages();
                  setTeacherDialog("create");
                }}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                Create teacher
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

      <section className="mb-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                applyFilters();
              }
            }}
            placeholder="Search teachers..."
            className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Search
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={schoolId}
            onChange={(event) => setSchoolId(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
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
              setActiveFilter(event.target.value as ActiveStatusFilter)
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
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
            Loading teachers...
          </div>
        ) : visibleTeachers.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            No teachers found.
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
                          aria-label="Select all teachers on this page"
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
                      Code
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">
                      School / Campus
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
                  {visibleTeachers.map((teacher) => (
                    <tr key={teacher.teacherId} className="hover:bg-slate-50">
                      {canManage ? (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(teacher.teacherId)}
                            onChange={() => toggleSelect(teacher.teacherId)}
                            aria-label={`Select ${teacher.fullName}`}
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                        </td>
                      ) : null}
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {teacher.fullName}
                        <p className="text-xs font-normal text-slate-500">
                          ID {teacher.teacherId}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {teacher.username}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {teacher.teacherCode}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {teacher.schoolId} / {teacher.campusId}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            teacher.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {teacher.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {canManage ? (
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                clearMessages();
                                setTeacherDialog(teacher);
                              }}
                              disabled={busy}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void toggleActive(teacher)}
                              disabled={busy}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                            >
                              {teacher.isActive ? "Deactivate" : "Activate"}
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

      {teacherDialog ? (
        <TeacherFormDialog
          teacher={teacherDialog === "create" ? null : teacherDialog}
          schools={schools}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          onClose={() => setTeacherDialog(null)}
          onSubmit={handleFormSubmit}
        />
      ) : null}
    </div>
  );
}
