import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Pencil, UserCheck, UserX } from "lucide-react";
import type { ApiError } from "@/core/api/types";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import type {
  CreateDirectoryCampusAdminInput,
  DirectoryCampusAdmin,
  UpdateDirectoryCampusAdminInput,
} from "@/features/directory/domain/directoryTypes";
import { AccountStatusBadge } from "@/features/directory/presentation/components/AccountStatusBadge";
import {
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
import {
  DIRECTORY_ACCOUNT_STATUS_FILTER_OPTIONS,
  matchesDirectoryAccountStatusFilter,
  type DirectoryAccountStatusFilter,
} from "@/features/directory/presentation/utils/accountStatus";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

function ForbiddenScreen() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] p-8 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Access denied</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Only PortalAdmin and SchoolAdmin accounts can manage campus admins.
        </p>
        <Button asChild type="button" variant="outline" className="mt-6">
          <Link to="/admin/directory">Back to directory</Link>
        </Button>
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
  const [activeFilter, setActiveFilter] =
    useState<DirectoryAccountStatusFilter>("all");
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

  const totalCount = data?.totalCount ?? 0;

  const visibleAdmins = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter((admin) =>
      matchesDirectoryAccountStatusFilter(
        admin.accountStatus,
        admin.isActive,
        activeFilter,
      ),
    );
  }, [data?.items, activeFilter]);

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

  function rowActions(admin: DirectoryCampusAdmin) {
    return (
      <>
        <DirectoryIconAction
          icon={Pencil}
          label={`Edit ${admin.fullName}`}
          disabled={busy}
          onClick={() => {
            clearMessages();
            setAdminDialog(admin);
          }}
        />
        <DirectoryIconAction
          icon={admin.isActive ? UserX : UserCheck}
          label={
            admin.isActive
              ? `Deactivate ${admin.fullName}`
              : `Activate ${admin.fullName}`
          }
          disabled={busy}
          onClick={() => void toggleActive(admin)}
        />
      </>
    );
  }

  return (
    <DirectoryPageShell
      title="Campus admins"
      primaryAction={
        <Button
          type="button"
          size="sm"
          className="h-9 whitespace-nowrap"
          onClick={() => {
            clearMessages();
            setAdminDialog("create");
          }}
        >
          Create campus admin
        </Button>
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
            placeholder="Search campus admins..."
            containerClassName="min-w-0 flex-1 lg:min-w-[200px]"
          />
          {isPortalAdmin ? (
            <select
              value={schoolId}
              onChange={(event) => {
                setSchoolId(event.target.value);
              }}
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
          ) : null}
          <select
            value={campusId}
            onChange={(event) => {
              setCampusId(event.target.value);
              setPageNumber(1);
            }}
            disabled={selectedSchoolId == null}
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

      <DirectoryListPanel
        loading={isLoading}
        empty={visibleAdmins.length === 0}
        emptyTitle="No campus admins found"
        emptyDescription="Try a different search or clear filters."
        emptyActionLabel="Create campus admin"
        onEmptyAction={() => {
          clearMessages();
          setAdminDialog("create");
        }}
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
          {visibleAdmins.map((admin) => (
            <DirectoryEntityCard
              key={admin.userId}
              title={admin.fullName}
              subtitle={`@${admin.username}`}
              badge={
                <AccountStatusBadge
                  accountStatus={admin.accountStatus}
                  isActive={admin.isActive}
                />
              }
              meta={
                <p>
                  {admin.schoolName} · {admin.campusName}
                </p>
              }
              actions={rowActions(admin)}
            />
          ))}
        </DirectoryMobileList>

        <DirectoryTable>
          <DirectoryTableHead>
            <DirectoryTh>Name</DirectoryTh>
            <DirectoryTh>School</DirectoryTh>
            <DirectoryTh>Campus</DirectoryTh>
            <DirectoryTh>Status</DirectoryTh>
            <DirectoryTh align="right">Actions</DirectoryTh>
          </DirectoryTableHead>
          <tbody className="divide-y divide-border">
            {visibleAdmins.map((admin) => (
              <tr
                key={admin.userId}
                className="transition hover:bg-muted/40"
              >
                <DirectoryTd>
                  <p className="font-medium">{admin.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    @{admin.username}
                  </p>
                </DirectoryTd>
                <DirectoryTd className="text-muted-foreground">
                  {admin.schoolName}
                </DirectoryTd>
                <DirectoryTd className="text-muted-foreground">
                  {admin.campusName}
                </DirectoryTd>
                <DirectoryTd>
                  <AccountStatusBadge
                    accountStatus={admin.accountStatus}
                    isActive={admin.isActive}
                  />
                </DirectoryTd>
                <DirectoryTd align="right">
                  <div className="flex justify-end gap-2">
                    {rowActions(admin)}
                  </div>
                </DirectoryTd>
              </tr>
            ))}
          </tbody>
        </DirectoryTable>
      </DirectoryListPanel>

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
    </DirectoryPageShell>
  );
}
