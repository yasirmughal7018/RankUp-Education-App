import { useEffect, useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";
import { Button } from "@/components/ui/button";

interface LinkDirectoryTutorStudentDialogProps {
  tutorName: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (identifier: string) => Promise<void>;
}

/** Admin dialog: link a student to a tutor by CNIC or username. */
export function LinkDirectoryTutorStudentDialog({
  tutorName,
  isSubmitting,
  onClose,
  onSubmit,
}: LinkDirectoryTutorStudentDialogProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Link student</h2>
        <p className="mt-1 text-sm text-slate-600">
          Find an existing student by CNIC or username and link them to{" "}
          {tutorName}. This does not change the student’s school or class.
        </p>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form className="mt-5 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <label
              htmlFor="directory-tutor-student-identifier"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              CNIC or username
            </label>
            <input
              id="directory-tutor-student-identifier"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className={FORM_FIELD_CLASS}
              disabled={isSubmitting}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Linking…" : "Link student"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
