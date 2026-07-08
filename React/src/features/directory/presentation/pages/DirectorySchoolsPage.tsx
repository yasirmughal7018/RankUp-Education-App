import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import {
  useDirectoryCampusesQuery,
  useDirectorySchoolsQuery,
} from "@/features/directory/presentation/hooks/useDirectoryQueries";

export function DirectorySchoolsPage() {
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Schools"
        description="Select a school to view its campuses."
        action={
          <div className="flex gap-2">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                <li key={school.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedSchoolId(school.id)}
                    className={`flex w-full items-start justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50 ${
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
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                  <p className="font-medium text-slate-900">{campus.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    ID {campus.id}
                    {campus.address ? ` · ${campus.address}` : ""}
                  </p>
                  <span
                    className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      campus.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {campus.isActive ? "Active" : "Inactive"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
