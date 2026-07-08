import { useEffect, useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import type { AssignQuizInput } from "@/features/quizzes/domain/quizTypes";

interface AssignQuizDialogProps {
  isSubmitting: boolean;
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

export function AssignQuizDialog({
  isSubmitting,
  onClose,
  onSubmit,
}: AssignQuizDialogProps) {
  const { user } = useAuth();
  const isTeacher = user?.role === "Teacher";
  const [mode, setMode] = useState("selected");
  const [studentIdsText, setStudentIdsText] = useState("");
  const [groupId, setGroupId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [startAt, setStartAt] = useState(defaultDateTime(1));
  const [endAt, setEndAt] = useState(defaultDateTime(24));
  const [allowedAttempts, setAllowedAttempts] = useState(1);
  const [error, setError] = useState<string | null>(null);

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

    const studentIds = studentIdsText
      .split(/[,\s]+/)
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (mode === "selected" && studentIds.length === 0) {
      setError("Enter at least one student ID for selected assignment.");
      return;
    }

    if (mode === "group" && !groupId) {
      setError("Group ID is required for group assignment.");
      return;
    }

    if (mode === "allingrade" && !gradeId) {
      setError("Grade ID is required for all-in-grade assignment.");
      return;
    }

    try {
      await onSubmit({
        mode,
        studentIds,
        groupId: groupId ? Number(groupId) : null,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        allowedAttempts,
        gradeId: gradeId ? Number(gradeId) : null,
      });
    } catch (caught) {
      const apiError = caught as ApiError;
      setError(apiError.message || "Unable to assign quiz.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
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
            <label htmlFor="mode" className="mb-1 block text-sm font-medium text-slate-700">
              Assignment mode
            </label>
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
            <div>
              <label
                htmlFor="studentIds"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Student IDs
              </label>
              <input
                id="studentIds"
                value={studentIdsText}
                disabled={isSubmitting}
                onChange={(event) => setStudentIdsText(event.target.value)}
                className={inputClassName}
                placeholder="101, 102, 103"
              />
            </div>
          ) : null}

          {mode === "group" ? (
            <div>
              <label htmlFor="groupId" className="mb-1 block text-sm font-medium text-slate-700">
                Group ID
              </label>
              <input
                id="groupId"
                type="number"
                value={groupId}
                disabled={isSubmitting}
                onChange={(event) => setGroupId(event.target.value)}
                className={inputClassName}
                min={1}
              />
            </div>
          ) : null}

          {mode === "allingrade" ? (
            <div>
              <label htmlFor="gradeId" className="mb-1 block text-sm font-medium text-slate-700">
                Grade ID
              </label>
              <input
                id="gradeId"
                type="number"
                value={gradeId}
                disabled={isSubmitting}
                onChange={(event) => setGradeId(event.target.value)}
                className={inputClassName}
                min={1}
              />
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="startAt" className="mb-1 block text-sm font-medium text-slate-700">
                Start
              </label>
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
              <label htmlFor="endAt" className="mb-1 block text-sm font-medium text-slate-700">
                End
              </label>
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
            <label
              htmlFor="allowedAttempts"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Allowed attempts
            </label>
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
