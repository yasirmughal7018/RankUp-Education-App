import { useState } from "react";
import { Link } from "react-router-dom";
import type { ApiError } from "@/core/api/types";
import { PageHeader } from "@/core/components/PageHeader";
import type {
  DirectoryCampus,
  DirectorySchool,
  UpsertCampusInput,
  UpsertSchoolInput,
} from "@/features/directory/domain/directoryTypes";
import { CampusFormDialog } from "@/features/directory/presentation/components/CampusFormDialog";
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

export function DirectorySchoolsPage() {
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
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
    isFetching,
  } = useDirectorySchoolsQuery();
  const {
    data: campuses = [],
    isLoading: campusesLoading,
    error: campusesError,
  } = useDirectoryCampusesQuery(selectedSchoolId ?? 0, selectedSchoolId != null);

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Schools"
        description="Manage schools and campuses. SuperAdmin and SchoolAdmin can create, edit, and activate."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                clearMessages();
                setSchoolDialog("create");
              }}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Create school
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Schools</h2>
          </div>
          {isLoading ? (
            <div className="px-6 py-10 text-center text-sm text-slate-600">
              Loading schools...
            </div>
          ) : schools.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-600">
              No schools found.
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {schools.map((school) => (
                <li key={school.id} className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setSelectedSchoolId(school.id)}
                    className={`flex w-full items-start justify-between gap-3 rounded-lg px-2 py-1 text-left transition hover:bg-slate-50 ${
                      selectedSchoolId === school.id ? "bg-brand-50" : ""
                    }`}
                  >
                    <div>
                      <p className="font-medium text-slate-900">{school.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Code {school.code} · ID {school.id}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        school.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {school.isActive ? "Active" : "Inactive"}
                    </span>
                  </button>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        clearMessages();
                        setSchoolDialog(school);
                      }}
                      disabled={schoolBusy}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleSchoolActive(school)}
                      disabled={schoolBusy}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                    >
                      {school.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Campuses</h2>
            {selectedSchoolId ? (
              <button
                type="button"
                onClick={() => {
                  clearMessages();
                  setCampusDialog("create");
                }}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700"
              >
                Add campus
              </button>
            ) : null}
          </div>
          {!selectedSchoolId ? (
            <div className="px-6 py-10 text-center text-sm text-slate-600">
              Select a school to load campuses.
            </div>
          ) : campusesLoading ? (
            <div className="px-6 py-10 text-center text-sm text-slate-600">
              Loading campuses...
            </div>
          ) : campusesError ? (
            <div className="px-6 py-10 text-center text-sm text-red-700">
              {campusesError.message}
            </div>
          ) : campuses.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-600">
              No campuses for this school.
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {campuses.map((campus) => (
                <li key={campus.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{campus.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        ID {campus.id}
                        {campus.address ? ` · ${campus.address}` : ""}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        campus.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {campus.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        clearMessages();
                        setCampusDialog(campus);
                      }}
                      disabled={campusBusy}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleCampusActive(campus)}
                      disabled={campusBusy}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                    >
                      {campus.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
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
    </div>
  );
}
