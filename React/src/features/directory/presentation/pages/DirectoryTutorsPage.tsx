import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Link2, Users } from "lucide-react";
import type { ApiError } from "@/core/api/types";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import type {
  CreateDirectoryTutorInput,
  DirectoryTutor,
  GrantCoordinatorRoleInput,
  GrantTeacherRoleInput,
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
import { LinkDirectoryTutorStudentDialog } from "@/features/directory/presentation/components/LinkDirectoryTutorStudentDialog";
import { ManageLinkedStudentsDialog } from "@/features/directory/presentation/components/ManageLinkedStudentsDialog";
import { RemoveDirectoryRoleDialog } from "@/features/directory/presentation/components/RemoveDirectoryRoleDialog";
import { TutorFormDialog } from "@/features/directory/presentation/components/TutorFormDialog";
import {
  useActivateTutorMutation,
  useCreateTutorMutation,
  useDeactivateTutorMutation,
  useDirectorySchoolsQuery,
  useDirectoryTutorsQuery,
  useGrantCoordinatorRoleToTutorMutation,
  useGrantParentRoleToTutorMutation,
  useGrantTeacherRoleToTutorMutation,
  useLinkDirectoryTutorStudentMutation,
  useRemoveDirectoryRoleMutation,
  useUnlinkDirectoryTutorStudentMutation,
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
  const [grantParentTarget, setGrantParentTarget] =
    useState<DirectoryTutor | null>(null);
  const [grantTeacherTarget, setGrantTeacherTarget] =
    useState<DirectoryTutor | null>(null);
  const [grantCoordinatorTarget, setGrantCoordinatorTarget] =
    useState<DirectoryTutor | null>(null);
  const [linkStudentTarget, setLinkStudentTarget] =
    useState<DirectoryTutor | null>(null);
  const [manageStudentsTarget, setManageStudentsTarget] =
    useState<DirectoryTutor | null>(null);
  const [deactivateTarget, setDeactivateTarget] =
    useState<DirectoryTutor | null>(null);
  const [removeRoleTarget, setRemoveRoleTarget] = useState<{
    tutorId: number;
    fullName: string;
    role: DirectoryCombinableRole;
  } | null>(null);
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
  const { data: schools = [] } = useDirectorySchoolsQuery(isPortalAdmin);

  const createMutation = useCreateTutorMutation();
  const activateMutation = useActivateTutorMutation();
  const deactivateMutation = useDeactivateTutorMutation();
  const grantParentMutation = useGrantParentRoleToTutorMutation();
  const grantTeacherMutation = useGrantTeacherRoleToTutorMutation();
  const grantCoordinatorMutation = useGrantCoordinatorRoleToTutorMutation();
  const linkStudentMutation = useLinkDirectoryTutorStudentMutation();
  const unlinkStudentMutation = useUnlinkDirectoryTutorStudentMutation();
  const removeRoleMutation = useRemoveDirectoryRoleMutation();

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
    deactivateMutation.isPending ||
    grantParentMutation.isPending ||
    grantTeacherMutation.isPending ||
    grantCoordinatorMutation.isPending ||
    linkStudentMutation.isPending ||
    unlinkStudentMutation.isPending ||
    removeRoleMutation.isPending;

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
    if (tutor.isActive) {
      setDeactivateTarget(tutor);
      return;
    }
    try {
      await activateMutation.mutateAsync(tutor.tutorId);
      setSuccessMessage(`Activated ${tutor.fullName}.`);
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(apiError.message ?? "Unable to update tutor status.");
    }
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) {
      return;
    }
    clearMessages();
    try {
      await deactivateMutation.mutateAsync(deactivateTarget.tutorId);
      setSuccessMessage(`Deactivated ${deactivateTarget.fullName}.`);
      setDeactivateTarget(null);
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(apiError.message ?? "Unable to update tutor status.");
    }
  }

  function rowActions(tutor: DirectoryTutor) {
    const roles = tutor.roles ?? [];
    const hasParentRole = roles.includes("Parent");
    const hasTeacherRole = roles.includes("Teacher");
    const hasCoordinatorRole = roles.includes("Coordinator");
    const removableRoles = getRemovableDirectoryRoles(roles, "Tutor");
    const overflowItems = [
      {
        id: "toggle-active",
        label: tutor.isActive ? "Deactivate" : "Activate",
        onSelect: () => void toggleActive(tutor),
        disabled: busy,
        tone: tutor.isActive ? ("danger" as const) : ("default" as const),
      },
      ...(!hasParentRole
        ? [
            {
              id: "add-parent",
              label: "Add Parent role",
              onSelect: () => {
                clearMessages();
                setGrantParentTarget(tutor);
              },
              disabled: busy,
            },
          ]
        : []),
      ...(!hasTeacherRole
        ? [
            {
              id: "add-teacher",
              label: "Add Teacher role",
              onSelect: () => {
                clearMessages();
                setGrantTeacherTarget(tutor);
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
                setGrantCoordinatorTarget(tutor);
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
            tutorId: tutor.tutorId,
            fullName: tutor.fullName,
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
          label={`Link student to ${tutor.fullName}`}
          disabled={busy}
          onClick={() => {
            clearMessages();
            setManageStudentsTarget(null);
            setLinkStudentTarget(tutor);
          }}
        />
        <DirectoryIconAction
          icon={Users}
          label={`Manage linked students for ${tutor.fullName}`}
          disabled={busy}
          onClick={() => {
            clearMessages();
            setLinkStudentTarget(null);
            setManageStudentsTarget(tutor);
          }}
        />
        <DirectoryRowOverflowMenu
          label={`More actions for ${tutor.fullName}`}
          disabled={busy}
          items={overflowItems}
        />
      </>
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
              subtitle={(() => {
                const rolesLabel = formatDirectoryListDisplayRoles(
                  tutor.roles,
                  "Tutor",
                );
                return rolesLabel
                  ? `${tutor.username} · ${rolesLabel}`
                  : tutor.username;
              })()}
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
            {visibleTutors.map((tutor) => {
              const rolesLabel = formatDirectoryListDisplayRoles(
                tutor.roles,
                "Tutor",
              );
              return (
              <tr
                key={tutor.tutorId}
                className="transition hover:bg-muted/40"
              >
                <DirectoryTd>
                  <p className="font-medium">{tutor.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {tutor.username}
                  </p>
                  {rolesLabel ? (
                    <p className="mt-0.5 text-xs font-medium text-primary">
                      Roles: {rolesLabel}
                    </p>
                  ) : null}
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
              );
            })}
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

      {manageStudentsTarget ? (
        <ManageLinkedStudentsDialog
          parentName={manageStudentsTarget.fullName}
          title="Linked students"
          description={`Students linked to ${manageStudentsTarget.fullName}.`}
          linkedStudents={manageStudentsTarget.linkedStudents ?? []}
          isSubmitting={unlinkStudentMutation.isPending}
          onClose={() => setManageStudentsTarget(null)}
          onUnlink={async (studentId, studentName) => {
            await unlinkStudentMutation.mutateAsync({
              tutorId: manageStudentsTarget.tutorId,
              studentId,
            });
            setSuccessMessage(
              `Unlinked ${studentName} from ${manageStudentsTarget.fullName}.`,
            );
            setManageStudentsTarget((current) =>
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
          }}
          onAddLink={() => {
            const tutor = manageStudentsTarget;
            setManageStudentsTarget(null);
            setLinkStudentTarget(tutor);
          }}
        />
      ) : null}

      {linkStudentTarget ? (
        <LinkDirectoryTutorStudentDialog
          tutorName={linkStudentTarget.fullName}
          isSubmitting={linkStudentMutation.isPending}
          onClose={() => setLinkStudentTarget(null)}
          onSubmit={async (identifier) => {
            const result = await linkStudentMutation.mutateAsync({
              tutorId: linkStudentTarget.tutorId,
              input: { identifier },
            });
            setSuccessMessage(
              result.alreadyLinked
                ? `${result.fullName} was already linked to ${linkStudentTarget.fullName}.`
                : `Linked ${result.fullName} to ${linkStudentTarget.fullName}.`,
            );
            setLinkStudentTarget(null);
            void refetch();
          }}
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
              tutorId: grantTeacherTarget.tutorId,
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
            await grantCoordinatorMutation.mutateAsync({
              tutorId: grantCoordinatorTarget.tutorId,
              input: input as GrantCoordinatorRoleInput,
            });
            setSuccessMessage(
              `Coordinator role added to ${grantCoordinatorTarget.fullName}.`,
            );
            setGrantCoordinatorTarget(null);
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
            ? `Add the Parent role to ${grantParentTarget.fullName}? They keep Tutor access and can switch roles after login.`
            : ""
        }
        confirmLabel="Add Parent"
        loading={grantParentMutation.isPending}
        onConfirm={() => {
          void (async () => {
            if (!grantParentTarget) {
              return;
            }
            try {
              await grantParentMutation.mutateAsync(grantParentTarget.tutorId);
              setSuccessMessage(
                `Parent role added to ${grantParentTarget.fullName}.`,
              );
              setGrantParentTarget(null);
            } catch (err) {
              const apiError = err as ApiError;
              setActionError(apiError.message ?? "Unable to add Parent role.");
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
        title="Deactivate tutor"
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

      <RemoveDirectoryRoleDialog
        open={removeRoleTarget != null}
        personName={removeRoleTarget?.fullName ?? ""}
        role={removeRoleTarget?.role ?? null}
        isSubmitting={removeRoleMutation.isPending}
        onClose={() => setRemoveRoleTarget(null)}
        onConfirm={() => {
          void (async () => {
            if (!removeRoleTarget) {
              return;
            }
            try {
              await removeRoleMutation.mutateAsync({
                context: "tutors",
                userId: removeRoleTarget.tutorId,
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
