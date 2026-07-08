import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { useDirectoryTeachersQuery } from "@/features/directory/presentation/hooks/useDirectoryQueries";

export function DirectoryTeachersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const { data: teachers = [], isLoading, error, refetch, isFetching } =
    useDirectoryTeachersQuery({ search: search || undefined });

  function applySearch() {
    setSearch(searchInput.trim());
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Teachers"
        description="Search teachers by name, username, or teacher code."
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

      <section className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4">
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              applySearch();
            }
          }}
          placeholder="Search teachers..."
          className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={applySearch}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          Search
        </button>
      </section>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            Loading teachers...
          </div>
        ) : teachers.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            No teachers found.
          </div>
        ) : (
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
                    Code
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    School / Campus
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {teachers.map((teacher) => (
                  <tr key={teacher.teacherId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {teacher.fullName}
                      <p className="text-xs font-normal text-slate-500">
                        ID {teacher.teacherId}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{teacher.username}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
