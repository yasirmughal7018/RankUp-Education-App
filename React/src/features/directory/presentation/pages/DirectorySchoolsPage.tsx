import { useMemo, useState } from "react";
import { Pencil, Power, PowerOff } from "lucide-react";
import type { ApiError } from "@/core/api/types";
import { AppCard } from "@/components/ui/app-card";
import { AppEmptyState } from "@/components/ui/app-empty-state";
import { AppErrorState } from "@/components/ui/app-error-state";
import { AppLoadingSkeleton } from "@/components/ui/app-loading-skeleton";
import { Button } from "@/components/ui/button";
import type {
  DirectoryCampus,
  DirectorySchool,
  UpsertCampusInput,
  UpsertSchoolInput,
} from "@/features/directory/domain/directoryTypes";
import { CampusFormDialog } from "@/features/directory/presentation/components/CampusFormDialog";
import {
  DirectoryFilterPanel,
  DirectoryFlash,
  DirectoryIconAction,
  DirectoryPageShell,
  directorySelectClassName,
} from "@/features/directory/presentation/components/DirectoryListChrome";
import { SchoolFormDialog } from "@/features/directory/presentation/components/SchoolFormDialog";
import {
  useActivateCampusMutation,
  useActivateSchoolMutation,
  useCreateCampusMutation,
  useCreateSchoolMutation,
  useDeactivateCampusMutation,
  useDeactivateSchoolMutation,
  useDirectoryCampusesQuery,
  useDirectorySchoolsQuery,
  useUpdateCampusMutation,
  useUpdateSchoolMutation,
} from "@/features/directory/presentation/hooks/useDirectoryQueries";
import {
  directoryReadyStatusClass,
  matchesReadyStatusFilter,
  READY_STATUS_FILTER_OPTIONS,
  type ReadyStatusFilter,
} from "@/features/directory/presentation/utils/accountStatus";
import { cn } from "@/lib/utils";

/** Schools and campuses master list with create, edit, and activate/deactivate. */
export function DirectorySchoolsPage() {
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReadyStatusFilter>("all");
  const [schoolDialog, setSchoolDialog] = useState<
    "create" | DirectorySchool | null
  >(null);
  const [campusDialog, setCampusDialog] = useState<
    "create" | DirectoryCampus | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    data: schools = [],
    isLoading,
    error,
    refetch,
  } = useDirectorySchoolsQuery();
  const {
    data: campuses = [],
    isLoading: campusesLoading,
    error: campusesError,
  } = useDirectoryCampusesQuery(selectedSchoolId ?? 0, selectedSchoolId != null);

  const visibleSchools = useMemo(
    () =>
      schools.filter((school) =>
        matchesReadyStatusFilter(school.isActive, statusFilter),
      ),
    [schools, statusFilter],
  );

  const visibleCampuses = useMemo(
    () =>
      campuses.filter((campus) =>
        matchesReadyStatusFilter(campus.isActive, statusFilter),
      ),
    [campuses, statusFilter],
  );

  const createSchoolMutation = useCreateSchoolMutation();
  const updateSchoolMutation = useUpdateSchoolMutation();
  const activateSchoolMutation = useActivateSchoolMutation();
  const deactivateSchoolMutation = useDeactivateSchoolMutation();
  const createCampusMutation = useCreateCampusMutation();
  const updateCampusMutation = useUpdateCampusMutation();
  const activateCampusMutation = useActivateCampusMutation();
  const deactivateCampusMutation = useDeactivateCampusMutation();

  const selectedSchool =
    schools.find((school) => school.id === selectedSchoolId) ?? null;

  const schoolBusy =
    createSchoolMutation.isPending ||
    updateSchoolMutation.isPending ||
    activateSchoolMutation.isPending ||
    deactivateSchoolMutation.isPending;

  const campusBusy =
    createCampusMutation.isPending ||
    updateCampusMutation.isPending ||
    activateCampusMutation.isPending ||
    deactivateCampusMutation.isPending;

  function clearMessages() {
    setActionError(null);
    setSuccessMessage(null);
  }

  async function handleSchoolSubmit(input: UpsertSchoolInput) {
    clearMessages();
    if (schoolDialog === "create") {
      const created = await createSchoolMutation.mutateAsync(input);
      setSuccessMessage(`Created school ${created.name}.`);
      setSelectedSchoolId(created.id);
    } else if (schoolDialog) {
      await updateSchoolMutation.mutateAsync({
        schoolId: schoolDialog.id,
        input,
      });
      setSuccessMessage(`Updated school ${input.name}.`);
    }
    setSchoolDialog(null);
  }

  async function handleCampusSubmit(input: UpsertCampusInput) {
    if (!selectedSchoolId) {
      return;
    }

    clearMessages();
    if (campusDialog === "create") {
      const created = await createCampusMutation.mutateAsync({
        schoolId: selectedSchoolId,
        input,
      });
      setSuccessMessage(`Created campus ${created.name}.`);
    } else if (campusDialog) {
      await updateCampusMutation.mutateAsync({
        campusId: campusDialog.id,
        schoolId: selectedSchoolId,
        input,
      });
      setSuccessMessage(`Updated campus ${input.name}.`);
    }
    setCampusDialog(null);
  }

  async function toggleSchoolActive(school: DirectorySchool) {
    clearMessages();
    try {
      if (school.isActive) {
        if (!window.confirm(`Deactivate ${school.name}?`)) {
          return;
        }
        await deactivateSchoolMutation.mutateAsync(school.id);
        setSuccessMessage(`Deactivated ${school.name}.`);
      } else {
        await activateSchoolMutation.mutateAsync(school.id);
        setSuccessMessage(`Activated ${school.name}.`);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(apiError.message ?? "Unable to update school status.");
    }
  }

  async function toggleCampusActive(campus: DirectoryCampus) {
    if (!selectedSchoolId) {
      return;
    }

    clearMessages();
    try {
      if (campus.isActive) {
        if (!window.confirm(`Deactivate ${campus.name}?`)) {
          return;
        }
        await deactivateCampusMutation.mutateAsync({
          campusId: campus.id,
          schoolId: selectedSchoolId,
        });
        setSuccessMessage(`Deactivated ${campus.name}.`);
      } else {
        await activateCampusMutation.mutateAsync({
          campusId: campus.id,
          schoolId: selectedSchoolId,
        });
        setSuccessMessage(`Activated ${campus.name}.`);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setActionError(apiError.message ?? "Unable to update campus status.");
    }
  }

  function schoolActions(school: DirectorySchool) {
    return (
      <>
        <DirectoryIconAction
          icon={Pencil}
          label={`Edit ${school.name}`}
          disabled={schoolBusy}
          onClick={() => {
            clearMessages();
            setSchoolDialog(school);
          }}
        />
        <DirectoryIconAction
          icon={school.isActive ? PowerOff : Power}
          label={
            school.isActive
              ? `Deactivate ${school.name}`
              : `Activate ${school.name}`
          }
          disabled={schoolBusy}
          onClick={() => void toggleSchoolActive(school)}
        />
      </>
    );
  }

  function campusActions(campus: DirectoryCampus) {
    return (
      <>
        <DirectoryIconAction
          icon={Pencil}
          label={`Edit ${campus.name}`}
          disabled={campusBusy}
          onClick={() => {
            clearMessages();
            setCampusDialog(campus);
          }}
        />
        <DirectoryIconAction
          icon={campus.isActive ? PowerOff : Power}
          label={
            campus.isActive
              ? `Deactivate ${campus.name}`
              : `Activate ${campus.name}`
          }
          disabled={campusBusy}
          onClick={() => void toggleCampusActive(campus)}
        />
      </>
    );
  }

  return (
    <DirectoryPageShell
      title="Schools"
      primaryAction={
        <Button
          type="button"
          size="sm"
          className="h-9 whitespace-nowrap"
          onClick={() => {
            clearMessages();
            setSchoolDialog("create");
          }}
        >
          Create school
        </Button>
      }
    >
      <DirectoryFilterPanel>
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as ReadyStatusFilter)
          }
          className={cn(directorySelectClassName, "lg:w-48")}
          aria-label="Filter by status"
        >
          {READY_STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </DirectoryFilterPanel>

      <DirectoryFlash
        error={error?.message ?? actionError}
        success={successMessage}
        onRetry={error ? () => void refetch() : undefined}
      />

      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        <AppCard padded={false} className="overflow-hidden">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-foreground">Schools</h2>
          </div>
          {isLoading ? (
            <div className="p-4 sm:p-5">
              <AppLoadingSkeleton variant="table" count={4} />
            </div>
          ) : visibleSchools.length === 0 ? (
            <div className="p-4 sm:p-5">
              <AppEmptyState
                title="No schools found"
                description="Try a different status filter or create a school."
                actionLabel="Create school"
                onAction={() => {
                  clearMessages();
                  setSchoolDialog("create");
                }}
              />
            </div>
          ) : (
            <ul className="space-y-3 p-3 sm:p-4">
              {visibleSchools.map((school) => {
                const isSelected = selectedSchoolId === school.id;
                return (
                  <li key={school.id}>
                    <article
                      className={cn(
                        "rounded-xl border px-4 py-3.5 shadow-sm transition",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border/80 bg-card hover:bg-muted/30",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedSchoolId(school.id)}
                        className="flex w-full items-start justify-between gap-3 text-left"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {school.name}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Code {school.code}
                          </p>
                        </div>
                        <span
                          className={`inline-flex shrink-0 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium ${directoryReadyStatusClass(
                            school.isActive,
                          )}`}
                        >
                          {school.isActive ? "Active" : "Inactive"}
                        </span>
                      </button>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {schoolActions(school)}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </AppCard>

        <AppCard padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-foreground">Campuses</h2>
            {selectedSchoolId ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  clearMessages();
                  setCampusDialog("create");
                }}
              >
                Add campus
              </Button>
            ) : null}
          </div>
          {!selectedSchoolId ? (
            <div className="p-4 sm:p-5">
              <AppEmptyState
                title="Select a school"
                description="Choose a school from the list to view and manage its campuses."
              />
            </div>
          ) : campusesLoading ? (
            <div className="p-4 sm:p-5">
              <AppLoadingSkeleton variant="table" count={4} />
            </div>
          ) : campusesError ? (
            <div className="p-4 sm:p-5">
              <AppErrorState
                message={campusesError.message}
                onRetry={() => void refetch()}
              />
            </div>
          ) : visibleCampuses.length === 0 ? (
            <div className="p-4 sm:p-5">
              <AppEmptyState
                title="No campuses for this school"
                description="Add a campus or adjust the status filter."
                actionLabel="Add campus"
                onAction={() => {
                  clearMessages();
                  setCampusDialog("create");
                }}
              />
            </div>
          ) : (
            <ul className="space-y-3 p-3 sm:p-4">
              {visibleCampuses.map((campus) => (
                <li key={campus.id}>
                  <article className="rounded-xl border border-border/80 bg-card px-4 py-3.5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {campus.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {campus.address || "No address added"}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium ${directoryReadyStatusClass(
                          campus.isActive,
                        )}`}
                      >
                        {campus.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {campusActions(campus)}
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </AppCard>
      </div>

      {schoolDialog ? (
        <SchoolFormDialog
          school={schoolDialog === "create" ? null : schoolDialog}
          isSubmitting={
            createSchoolMutation.isPending || updateSchoolMutation.isPending
          }
          onClose={() => setSchoolDialog(null)}
          onSubmit={handleSchoolSubmit}
        />
      ) : null}

      {campusDialog && selectedSchool ? (
        <CampusFormDialog
          campus={campusDialog === "create" ? null : campusDialog}
          schoolName={selectedSchool.name}
          isSubmitting={
            createCampusMutation.isPending || updateCampusMutation.isPending
          }
          onClose={() => setCampusDialog(null)}
          onSubmit={handleCampusSubmit}
        />
      ) : null}
    </DirectoryPageShell>
  );
}
