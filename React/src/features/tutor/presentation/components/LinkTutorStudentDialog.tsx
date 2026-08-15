import { useEffect, useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";

interface LinkTutorStudentDialogProps {
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (identifier: string) => Promise<void>;
}

export function LinkTutorStudentDialog({
  isSubmitting,
  onClose,
  onSubmit,
}: LinkTutorStudentDialogProps) {
  const [identifier, setIdentifier] = useState("");
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
    const trimmed = identifier.trim();
    if (!trimmed) {
      setError("Enter the student’s CNIC or username.");
      return;
    }

    try {
      await onSubmit(trimmed);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message ?? "Unable to link student.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-tutor-student-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2
          id="link-tutor-student-title"
          className="text-xl font-semibold text-slate-900"
        >
          Link student
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Find an existing student by CNIC or username. This does not change
          their school or class.
        </p>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form className="mt-5 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <label
              htmlFor="tutor-student-identifier"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              CNIC or username
            </label>
            <input
              id="tutor-student-identifier"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className={FORM_FIELD_CLASS}
              disabled={isSubmitting}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-70"
            >
              {isSubmitting ? "Linking…" : "Link student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
