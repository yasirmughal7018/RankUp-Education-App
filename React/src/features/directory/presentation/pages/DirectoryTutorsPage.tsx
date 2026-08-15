import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { UserCheck, UserX } from "lucide-react";
import type { ApiError } from "@/core/api/types";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import type {
  CreateDirectoryTutorInput,
  DirectoryTutor,
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
import { TutorFormDialog } from "@/features/directory/presentation/components/TutorFormDialog";
import {
  useActivateTutorMutation,
  useCreateTutorMutation,
  useDeactivateTutorMutation,
  useDirectoryTutorsQuery,
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
          Only PortalAdmin accounts can manage tutors.
        </p>
        <Button asChild type="button" variant="outline" className="mt-6">
          <Link to="/admin/directory">Back to directory</Link>
        </Button>
      </div>
    </div>
  );
}

function formatLinkedStudents(tutor: DirectoryTutor): string {
  const count = tutor.linkedStudentCount;
  if (count === 0) {
    return "No students linked";
  }
  return `${count} linked student${count === 1 ? "" : "s"}`;
}

/** PortalAdmin-only page to list and manage tutor accounts. */
export function DirectoryTutorsPage() {
  const { user } = useAuth();
  const isPortalAdmin = user?.role === "PortalAdmin";
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [activeFilter, setActiveFilter] =
    useState<DirectoryAccountStatusFilter>("all");
  const [pageNumber, setPageNumber] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      search: search || undefined,
      pageNumber,
      pageSize: PAGE_SIZE,
    }),
    [search, pageNumber],
  );

  const { data, isLoading, error, refetch, isFetching } =
    useDirectoryTutorsQuery(filters, isPortalAdmin);

  const createMutation = useCreateTutorMutation();
  const activateMutation = useActivateTutorMutation();
  const deactivateMutation = useDeactivateTutorMutation();

  const totalCount = data?.totalCount ?? 0;

  const visibleTutors = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter((tutor) =>
      matchesDirectoryAccountStatusFilter(
        tutor.accountStatus,
        tutor.isActive,
        activeFilter,
      ),
    );
  }, [data?.items, activeFilter]);

  const busy =
    createMutation.isPending ||
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

  async function handleCreate(input: CreateDirectoryTutorInput) {
    clearMessages();
    const created = await createMutation.mutateAsync(input);
    setShowCreate(false);
    setSuccessMessage(
      created.roles && created.roles.length > 1
        ? `Tutor role added to ${created.fullName}.`
        : `Created tutor ${created.fullName}. User must set password on first login.`,
    );
  }

  async function toggleActive(tutor: DirectoryTutor) {
    clearMessages();
    try {
      if (tutor.isActive) {
        if (!window.confirm(`Deactivate ${tutor.fullName}?`)) {
          return;
        }
        await deactivateMutation.mutateAsync(tutor.tutorId);
        setSuccessMessage(`Deactivated ${tutor.fullName}.`);
      } else {
        await activateMutation.mutateAsync(tutor.tutorId);
        setSuccessMessage(`Activated ${tutor.fullName}.`);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(apiError.message ?? "Unable to update tutor status.");
    }
  }

  function rowActions(tutor: DirectoryTutor) {
    return (
      <DirectoryIconAction
        icon={tutor.isActive ? UserX : UserCheck}
        label={
          tutor.isActive
            ? `Deactivate ${tutor.fullName}`
            : `Activate ${tutor.fullName}`
        }
        disabled={busy}
        onClick={() => void toggleActive(tutor)}
      />
    );
  }

  return (
    <DirectoryPageShell
      title="Tutors"
      primaryAction={
        <Button
          type="button"
          size="sm"
          className="h-9 whitespace-nowrap"
          onClick={() => {
            clearMessages();
            setShowCreate(true);
          }}
        >
          Create tutor
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
            placeholder="Search tutors..."
            containerClassName="min-w-0 flex-1 lg:min-w-[200px]"
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

      <DirectoryListPanel
        loading={isLoading}
        empty={visibleTutors.length === 0}
        emptyTitle="No tutors found"
        emptyDescription="Tutors are not tied to a school. Create one or wait for a self-registration."
        emptyActionLabel="Create tutor"
        onEmptyAction={() => {
          clearMessages();
          setShowCreate(true);
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
          {visibleTutors.map((tutor) => (
            <DirectoryEntityCard
              key={tutor.tutorId}
              title={tutor.fullName}
              subtitle={`@${tutor.username}`}
              badge={
                <AccountStatusBadge
                  accountStatus={tutor.accountStatus}
                  isActive={tutor.isActive}
                />
              }
              meta={<p>{formatLinkedStudents(tutor)}</p>}
              actions={rowActions(tutor)}
            />
          ))}
        </DirectoryMobileList>

        <DirectoryTable>
          <DirectoryTableHead>
            <DirectoryTh>Name</DirectoryTh>
            <DirectoryTh>Students</DirectoryTh>
            <DirectoryTh>Status</DirectoryTh>
            <DirectoryTh align="right">Actions</DirectoryTh>
          </DirectoryTableHead>
          <tbody className="divide-y divide-border">
            {visibleTutors.map((tutor) => (
              <tr
                key={tutor.tutorId}
                className="transition hover:bg-muted/40"
              >
                <DirectoryTd>
                  <p className="font-medium">{tutor.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    @{tutor.username}
                  </p>
                </DirectoryTd>
                <DirectoryTd className="text-muted-foreground">
                  {formatLinkedStudents(tutor)}
                </DirectoryTd>
                <DirectoryTd>
                  <AccountStatusBadge
                    accountStatus={tutor.accountStatus}
                    isActive={tutor.isActive}
                  />
                </DirectoryTd>
                <DirectoryTd align="right">
                  <div className="flex justify-end gap-2">
                    {rowActions(tutor)}
                  </div>
                </DirectoryTd>
              </tr>
            ))}
          </tbody>
        </DirectoryTable>
      </DirectoryListPanel>

      {showCreate ? (
        <TutorFormDialog
          isSubmitting={createMutation.isPending}
          onClose={() => {
            if (!createMutation.isPending) {
              setShowCreate(false);
            }
          }}
          onSubmit={handleCreate}
        />
      ) : null}
    </DirectoryPageShell>
  );
}
