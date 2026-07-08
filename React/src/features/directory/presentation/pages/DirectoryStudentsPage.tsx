import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { useDirectoryStudentsQuery } from "@/features/directory/presentation/hooks/useDirectoryQueries";

export function DirectoryStudentsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const { data: students = [], isLoading, error, refetch, isFetching } =
    useDirectoryStudentsQuery({ search: search || undefined });

  function applySearch() {
    setSearch(searchInput.trim());
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Students"
        description="Search the student directory by name, username, or roll number."
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
          placeholder="Search students..."
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
            Loading students...
          </div>
        ) : students.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-600">
            No students found.
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
                    Roll
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Grade
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
                {students.map((student) => (
                  <tr key={student.studentId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {student.fullName}
                      <p className="text-xs font-normal text-slate-500">
                        ID {student.studentId}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{student.username}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {student.rollNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {student.grade}
                      {student.section}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {student.schoolId} / {student.campusId}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          student.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {student.isActive ? "Active" : "Inactive"}
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
