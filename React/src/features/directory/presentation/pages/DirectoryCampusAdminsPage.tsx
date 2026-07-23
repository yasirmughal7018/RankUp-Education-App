import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { ApiError } from "@/core/api/types";
import { PageHeader } from "@/core/components/PageHeader";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import type {
  ActiveStatusFilter,
  CreateDirectoryCampusAdminInput,
  DirectoryCampusAdmin,
  UpdateDirectoryCampusAdminInput,
} from "@/features/directory/domain/directoryTypes";
import { CampusAdminFormDialog } from "@/features/directory/presentation/components/CampusAdminFormDialog";
import { DirectoryPagination } from "@/features/directory/presentation/components/DirectoryPagination";
import {
  useActivateCampusAdminMutation,
  useCreateCampusAdminMutation,
  useDeactivateCampusAdminMutation,
  useDirectoryCampusAdminsQuery,
  useDirectoryCampusesQuery,
  useDirectorySchoolsQuery,
  useUpdateCampusAdminMutation,
} from "@/features/directory/presentation/hooks/useDirectoryQueries";
import { AccountStatusBadge } from "@/features/directory/presentation/components/AccountStatusBadge";

const PAGE_SIZE = 50;

function ForbiddenScreen() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Access denied</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Only PortalAdmin and SchoolAdmin accounts can manage campus admins.
        </p>
        <Link
          to="/admin/directory"
          className="mt-6 inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Back to directory
        </Link>
      </div>
    </div>
  );
}

/** PortalAdmin/SchoolAdmin page to list and manage campus admin accounts. */
export function DirectoryCampusAdminsPage() {
  const { user } = useAuth();
  const isPortalAdmin = user?.role === "PortalAdmin";
  const isSchoolAdmin = user?.role === "SchoolAdmin";
  const canManage = isPortalAdmin || isSchoolAdmin;
  const lockedSchoolId =
    isSchoolAdmin && user?.schoolId != null ? user.schoolId : null;
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [schoolId, setSchoolId] = useState(
    lockedSchoolId != null ? String(lockedSchoolId) : "",
  );
  const [campusId, setCampusId] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveStatusFilter>("all");
  const [pageNumber, setPageNumber] = useState(1);
  const [adminDialog, setAdminDialog] = useState<
    "create" | DirectoryCampusAdmin | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedSchoolId =
    lockedSchoolId ?? (Number(schoolId) || null);
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
    useDirectoryCampusAdminsQuery(filters, canManage);

  const createMutation = useCreateCampusAdminMutation();
  const updateMutation = useUpdateCampusAdminMutation();
  const activateMutation = useActivateCampusAdminMutation();
  const deactivateMutation = useDeactivateCampusAdminMutation();

  const campusAdmins = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;

  const visibleAdmins = useMemo(() => {
    if (activeFilter === "all") {
      return campusAdmins;
    }
    const wantActive = activeFilter === "active";
    return campusAdmins.filter((admin) => admin.isActive === wantActive);
  }, [campusAdmins, activeFilter]);

  useEffect(() => {
    if (lockedSchoolId != null) {
      setSchoolId(String(lockedSchoolId));
    }
  }, [lockedSchoolId]);

  useEffect(() => {
    setCampusId("");
    setPageNumber(1);
  }, [schoolId]);

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    activateMutation.isPending ||
    deactivateMutation.isPending;

  if (!canManage) {
    return <ForbiddenScreen />;
  }

  function clearMessages() {
    setActionError(null);
    setSuccessMessage(null);
  }

  function applyFilters() {
    setSearch(searchInput.trim());
    setPageNumber(1);
  }

  async function handleFormSubmit(payload: {
    mode: "create" | "edit";
    input: CreateDirectoryCampusAdminInput | UpdateDirectoryCampusAdminInput;
  }) {
    clearMessages();
    if (payload.mode === "create") {
      const created = await createMutation.mutateAsync(
        payload.input as CreateDirectoryCampusAdminInput,
      );
      setSuccessMessage(
        `Created campus admin ${created.fullName}. User must set password on first login.`,
      );
    } else if (adminDialog && adminDialog !== "create") {
      await updateMutation.mutateAsync({
        userId: adminDialog.userId,
        input: payload.input as UpdateDirectoryCampusAdminInput,
      });
      setSuccessMessage(`Updated campus admin ${payload.input.fullName}.`);
    }
    setAdminDialog(null);
  }

  async function toggleActive(admin: DirectoryCampusAdmin) {
    clearMessages();
    try {
      if (admin.isActive) {
        if (!window.confirm(`Deactivate ${admin.fullName}?`)) {
          return;
        }
        await deactivateMutation.mutateAsync(admin.userId);
        setSuccessMessage(`Deactivated ${admin.fullName}.`);
      } else {
        await activateMutation.mutateAsync(admin.userId);
        setSuccessMessage(`Activated ${admin.fullName}.`);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(
        apiError.message ?? "Unable to update campus admin status.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Campus admins"
        description="Create and manage campus admin accounts. PortalAdmin and SchoolAdmin only."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                clearMessages();
                setAdminDialog("create");
              }}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Create campus admin
            </button>
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
            placeholder="Search campus admins..."
            className="min-w-[220px] flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring"
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
          {isPortalAdmin ? (
            <select
              value={schoolId}
              onChange={(event) => {
                setSchoolId(event.target.value);
              }}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring"
            >
              <option value="">All schools</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          ) : null}
          <select
            value={campusId}
            onChange={(event) => {
              setCampusId(event.target.value);
              setPageNumber(1);
            }}
            disabled={selectedSchoolId == null}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring disabled:opacity-70"
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
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring"
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

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            Loading campus admins...
          </div>
        ) : visibleAdmins.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            No campus admins found.
          </div>
        ) : (
          <>
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
                      School
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">
                      Campus
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
                  {visibleAdmins.map((admin) => (
                    <tr key={admin.userId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {admin.fullName}
                        <p className="text-xs font-normal text-slate-500">
                          ID {admin.userId}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {admin.username}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {admin.schoolName}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {admin.campusName}
                      </td>
                      <td className="px-4 py-3">
                        <AccountStatusBadge
                          accountStatus={admin.accountStatus}
                          isActive={admin.isActive}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              clearMessages();
                              setAdminDialog(admin);
                            }}
                            disabled={busy}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleActive(admin)}
                            disabled={busy}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                          >
                            {admin.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
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

      {adminDialog ? (
        <CampusAdminFormDialog
          campusAdmin={adminDialog === "create" ? null : adminDialog}
          schools={schools}
          lockSchoolId={lockedSchoolId}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          onClose={() => setAdminDialog(null)}
          onSubmit={handleFormSubmit}
        />
      ) : null}
    </div>
  );
}
