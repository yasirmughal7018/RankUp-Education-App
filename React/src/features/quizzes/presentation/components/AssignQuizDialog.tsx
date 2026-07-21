import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import { FieldLabel } from "@/core/components/FieldLabel";
import { LookupSelect } from "@/core/components/LookupSelect";
import { LOOKUP_TYPES } from "@/core/lookups/lookupTypes";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import { useDirectoryStudentsQuery } from "@/features/directory/presentation/hooks/useDirectoryQueries";
import type { AssignQuizInput } from "@/features/quizzes/domain/quizTypes";

interface AssignQuizDialogProps {
  isSubmitting: boolean;
  defaultGrade?: string;
  onClose: () => void;
  onSubmit: (input: AssignQuizInput) => Promise<void>;
}

const inputClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2";

function defaultDateTime(offsetHours: number): string {
  const date = new Date();
  date.setHours(date.getHours() + offsetHours);
  date.setMinutes(0, 0, 0);
  return date.toISOString().slice(0, 16);
}

function parseGradeNumber(grade?: string): number | null {
  if (!grade?.trim()) {
    return null;
  }

  const match = grade.match(/\d+/);
  if (!match) {
    return null;
  }

  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

/** Modal to assign a quiz to students, a group, or a grade with a schedule. */
export function AssignQuizDialog({
  isSubmitting,
  defaultGrade,
  onClose,
  onSubmit,
}: AssignQuizDialogProps) {
  const { user } = useAuth();
  const isTeacher = user?.role === "Teacher";
  const [mode, setMode] = useState("selected");
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [groupId, setGroupId] = useState("");
  const [gradeId, setGradeId] = useState<number | "">("");
  const [gradeFilter, setGradeFilter] = useState<number | "">(
    () => parseGradeNumber(defaultGrade) ?? "",
  );
  const [startAt, setStartAt] = useState(defaultDateTime(1));
  const [endAt, setEndAt] = useState(defaultDateTime(24));
  const [allowedAttempts, setAllowedAttempts] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(studentSearch.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [studentSearch]);

  const studentsQuery = useDirectoryStudentsQuery(
    {
      search: debouncedSearch || undefined,
      grade: gradeFilter === "" ? undefined : gradeFilter,
      pageNumber: 1,
      pageSize: 50,
    },
    mode === "selected",
  );

  const students = studentsQuery.data?.items ?? [];

  const selectedSet = useMemo(
    () => new Set(selectedStudentIds),
    [selectedStudentIds],
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

  function toggleStudent(studentId: number) {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (mode === "selected" && selectedStudentIds.length === 0) {
      setError("Select at least one student for selected assignment.");
      return;
    }

    if (mode === "group" && !groupId) {
      setError("Group ID is required for group assignment.");
      return;
    }

    if (mode === "allingrade" && gradeId === "") {
      setError("Grade is required for all-in-grade assignment.");
      return;
    }

    try {
      await onSubmit({
        mode,
        studentIds: selectedStudentIds,
        groupId: groupId ? Number(groupId) : null,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        allowedAttempts,
        gradeId: gradeId === "" ? null : gradeId,
      });
    } catch (caught) {
      const apiError = caught as ApiError;
      setError(apiError.message || "Unable to assign quiz.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-slate-900">Assign quiz</h2>
        <p className="mt-2 text-sm text-slate-600">
          Choose students and set the assignment window.
        </p>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <FieldLabel htmlFor="mode" required>
              Assignment mode
            </FieldLabel>
            <select
              id="mode"
              value={mode}
              disabled={isSubmitting}
              onChange={(event) => setMode(event.target.value)}
              className={inputClassName}
            >
              <option value="selected">Selected students</option>
              <option value="group">Group</option>
              {isTeacher ? <option value="allingrade">All in grade</option> : null}
            </select>
          </div>

          {mode === "selected" ? (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="studentSearch"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Search students
                  </label>
                  <input
                    id="studentSearch"
                    value={studentSearch}
                    disabled={isSubmitting}
                    onChange={(event) => setStudentSearch(event.target.value)}
                    className={inputClassName}
                    placeholder="Name, username, or roll #"
                  />
                </div>
                <div>
                  <label
                    htmlFor="gradeFilter"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Grade filter
                  </label>
                  <input
                    id="gradeFilter"
                    type="number"
                    value={gradeFilter}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      setGradeFilter(
                        event.target.value === ""
                          ? ""
                          : Number(event.target.value),
                      )
                    }
                    className={inputClassName}
                    min={1}
                    placeholder="Optional"
                  />
                </div>
              </div>

              {selectedStudentIds.length > 0 ? (
                <p className="text-xs text-slate-600">
                  {selectedStudentIds.length} student
                  {selectedStudentIds.length === 1 ? "" : "s"} selected
                </p>
              ) : null}

              <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
                {studentsQuery.isLoading ? (
                  <p className="px-3 py-4 text-sm text-slate-600">
                    Loading students...
                  </p>
                ) : studentsQuery.error ? (
                  <p className="px-3 py-4 text-sm text-red-700">
                    {studentsQuery.error.message}
                  </p>
                ) : students.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-slate-600">
                    No students found. Try a different search.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {students.map((student) => {
                      const checked = selectedSet.has(student.studentId);
                      return (
                        <li key={student.studentId}>
                          <label className="flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={isSubmitting}
                              onChange={() => toggleStudent(student.studentId)}
                              className="mt-1"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-slate-900">
                                {student.fullName}
                              </span>
                              <span className="block text-xs text-slate-500">
                                Grade {student.grade}
                                {student.section ? `-${student.section}` : ""} ·{" "}
                                {student.rollNumber || student.username}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : null}

          {mode === "group" ? (
            <div>
              <FieldLabel htmlFor="groupId" required>
                Group ID
              </FieldLabel>
              <input
                id="groupId"
                type="number"
                value={groupId}
                disabled={isSubmitting}
                onChange={(event) => setGroupId(event.target.value)}
                className={inputClassName}
                min={1}
              />
              <p className="mt-1 text-xs text-slate-500">
                Enter the student group ID to assign.
              </p>
            </div>
          ) : null}

          {mode === "allingrade" ? (
            <LookupSelect
              label="Grade"
              value={gradeId}
              onChange={setGradeId}
              type={LOOKUP_TYPES.CLASS}
              disabled={isSubmitting}
              required
              placeholder="Select grade..."
            />
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="startAt" required>
                Start
              </FieldLabel>
              <input
                id="startAt"
                type="datetime-local"
                value={startAt}
                disabled={isSubmitting}
                onChange={(event) => setStartAt(event.target.value)}
                className={inputClassName}
                required
              />
            </div>

            <div>
              <FieldLabel htmlFor="endAt" required>
                End
              </FieldLabel>
              <input
                id="endAt"
                type="datetime-local"
                value={endAt}
                disabled={isSubmitting}
                onChange={(event) => setEndAt(event.target.value)}
                className={inputClassName}
                required
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="allowedAttempts" required>
              Allowed attempts
            </FieldLabel>
            <input
              id="allowedAttempts"
              type="number"
              value={allowedAttempts}
              disabled={isSubmitting}
              onChange={(event) => setAllowedAttempts(Number(event.target.value))}
              className={inputClassName}
              min={1}
              required
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
            >
              {isSubmitting ? "Assigning..." : "Assign quiz"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
