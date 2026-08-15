import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import { SearchableSelect } from "@/core/components/SearchableSelect";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";
import { useDirectoryStudentsQuery } from "@/features/directory/presentation/hooks/useDirectoryQueries";

interface LinkStudentDialogProps {
  parentName: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (studentId: number, relationship: string) => Promise<void>;
}

const inputClassName = FORM_FIELD_CLASS;

/** Link a directory student to a parent (searchable student picker). */
export function LinkStudentDialog({
  parentName,
  isSubmitting,
  onClose,
  onSubmit,
}: LinkStudentDialogProps) {
  const [studentId, setStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [relationship, setRelationship] = useState("Guardian");
  const [error, setError] = useState<string | null>(null);

  const studentsQuery = useDirectoryStudentsQuery({
    search: studentSearch.trim() || undefined,
    pageNumber: 1,
    pageSize: 50,
  });

  const studentOptions = useMemo(
    () =>
      (studentsQuery.data?.items ?? []).map((student) => ({
        value: String(student.studentId),
        label: `${student.fullName} | ${student.username}`,
      })),
    [studentsQuery.data?.items],
  );

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isSubmitting, onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedId = Number(studentId);
    if (!parsedId || parsedId < 1) {
      setError("Select a student to link.");
      return;
    }

    try {
      await onSubmit(parsedId, relationship.trim() || "Guardian");
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message ?? "Unable to link student.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Link student</h2>
        <p className="mt-1 text-sm text-slate-600">
          Link a student to {parentName}.
        </p>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="mt-5 space-y-4"
        >
          <div>
            <label
              htmlFor="linkStudentSearch"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Search students
            </label>
            <input
              id="linkStudentSearch"
              type="search"
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              className={inputClassName}
              placeholder="Name, username, roll…"
            />
          </div>

          <div>
            <label
              htmlFor="linkStudentId"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Student <span className="text-destructive">*</span>
            </label>
            <SearchableSelect
              id="linkStudentId"
              value={studentId}
              allowEmpty
              emptyLabel={
                studentsQuery.isLoading ? "Loading…" : "Select student"
              }
              placeholder={
                studentsQuery.isLoading ? "Loading…" : "Select student"
              }
              options={studentOptions}
              onChange={setStudentId}
              disabled={isSubmitting || studentsQuery.isLoading}
            />
          </div>

          <div>
            <label
              htmlFor="linkRelationship"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Relationship
            </label>
            <input
              id="linkRelationship"
              type="text"
              value={relationship}
              onChange={(event) => setRelationship(event.target.value)}
              className={inputClassName}
              placeholder="Guardian"
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
            >
              {isSubmitting ? "Linking..." : "Link student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
