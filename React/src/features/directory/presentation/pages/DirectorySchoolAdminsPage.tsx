import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Pencil, UserCheck, UserX } from "lucide-react";
import type { ApiError } from "@/core/api/types";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import type {
  CreateDirectorySchoolAdminInput,
  DirectorySchoolAdmin,
  UpdateDirectorySchoolAdminInput,
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
import { DirectoryPagination } from "@/features/directory/presentation/components/DirectoryPagination";
import { SchoolAdminFormDialog } from "@/features/directory/presentation/components/SchoolAdminFormDialog";
import {
  useActivateSchoolAdminMutation,
  useCreateSchoolAdminMutation,
  useDeactivateSchoolAdminMutation,
  useDirectorySchoolAdminsQuery,
  useDirectorySchoolsQuery,
  useUpdateSchoolAdminMutation,
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
          Only PortalAdmin accounts can manage school admins.
        </p>
        <Button asChild type="button" variant="outline" className="mt-6">
          <Link to="/admin/directory">Back to directory</Link>
        </Button>
      </div>
    </div>
  );
}

/** PortalAdmin-only page to list and manage school admin accounts. */
export function DirectorySchoolAdminsPage() {
  const { user } = useAuth();
  const isPortalAdmin = user?.role === "PortalAdmin";
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [schoolId, setSchoolId] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<DirectoryAccountStatusFilter>("all");
  const [pageNumber, setPageNumber] = useState(1);
  const [adminDialog, setAdminDialog] = useState<
    "create" | DirectorySchoolAdmin | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedSchoolId = Number(schoolId) || null;

  const { data: schools = [] } = useDirectorySchoolsQuery(isPortalAdmin);

  const filters = useMemo(
    () => ({
      search: search || undefined,
      schoolId: selectedSchoolId,
      pageNumber,
      pageSize: PAGE_SIZE,
    }),
    [search, selectedSchoolId, pageNumber],
  );

  const { data, isLoading, error, refetch, isFetching } =
    useDirectorySchoolAdminsQuery(filters, isPortalAdmin);

  const createMutation = useCreateSchoolAdminMutation();
  const updateMutation = useUpdateSchoolAdminMutation();
  const activateMutation = useActivateSchoolAdminMutation();
  const deactivateMutation = useDeactivateSchoolAdminMutation();

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

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    activateMutation.isPending ||
    deactivateMutation.isPending;

  if (!isPortalAdmin) {
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
    input: CreateDirectorySchoolAdminInput | UpdateDirectorySchoolAdminInput;
  }) {
    clearMessages();
    if (payload.mode === "create") {
      const created = await createMutation.mutateAsync(
        payload.input as CreateDirectorySchoolAdminInput,
      );
      setSuccessMessage(
        `Created school admin ${created.fullName}. User must set password on first login.`,
      );
    } else if (adminDialog && adminDialog !== "create") {
      await updateMutation.mutateAsync({
        userId: adminDialog.userId,
        input: payload.input as UpdateDirectorySchoolAdminInput,
      });
      setSuccessMessage(`Updated school admin ${payload.input.fullName}.`);
    }
    setAdminDialog(null);
  }

  async function toggleActive(admin: DirectorySchoolAdmin) {
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
        apiError.message ?? "Unable to update school admin status.",
      );
    }
  }

  function rowActions(admin: DirectorySchoolAdmin) {
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
      title="School admins"
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
          Create school admin
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
            placeholder="Search school admins..."
            containerClassName="min-w-0 flex-1 lg:min-w-[200px]"
          />
          <select
            value={schoolId}
            onChange={(event) => {
              setSchoolId(event.target.value);
              setPageNumber(1);
            }}
            className={cn(directorySelectClassName, "lg:w-48")}
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
        emptyTitle="No school admins found"
        emptyDescription="Try a different search or clear filters."
        emptyActionLabel="Create school admin"
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
              meta={<p>{admin.schoolName}</p>}
              actions={rowActions(admin)}
            />
          ))}
        </DirectoryMobileList>

        <DirectoryTable>
          <DirectoryTableHead>
            <DirectoryTh>Name</DirectoryTh>
            <DirectoryTh>School</DirectoryTh>
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
        <SchoolAdminFormDialog
          schoolAdmin={adminDialog === "create" ? null : adminDialog}
          schools={schools}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          onClose={() => setAdminDialog(null)}
          onSubmit={handleFormSubmit}
        />
      ) : null}
    </DirectoryPageShell>
  );
}
