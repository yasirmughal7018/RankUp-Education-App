import { useEffect, useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import { FieldLabel } from "@/core/components/FieldLabel";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";

interface AddCoordinatorClassSectionDialogProps {
  coordinatorName: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (grade: number) => Promise<void>;
}

/** Assign a whole class (grade) to a coordinator. */
export function AddCoordinatorClassSectionDialog({
  coordinatorName,
  isSubmitting,
  onClose,
  onSubmit,
}: AddCoordinatorClassSectionDialogProps) {
  const [grade, setGrade] = useState("");
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
    const parsedGrade = Number(grade);
    if (!parsedGrade || parsedGrade < 1) {
      setError("Enter a valid grade.");
      return;
    }

    try {
      await onSubmit(parsedGrade);
    } catch (err) {
      setError((err as ApiError).message ?? "Unable to add class.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Add class</h2>
        <p className="mt-1 text-sm text-slate-600">
          Assign a whole class (all sections) to {coordinatorName}.
        </p>

        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => void handleSubmit(event)}
        >
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <label className="block space-y-1.5">
            <FieldLabel htmlFor="coordinator-add-grade" required>
              Grade / class
            </FieldLabel>
            <input
              id="coordinator-add-grade"
              type="number"
              min={1}
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              disabled={isSubmitting}
              className={FORM_FIELD_CLASS}
              placeholder="e.g. 7"
              autoFocus
            />
          </label>

          <div className="flex justify-end gap-2 pt-1">
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
              {isSubmitting ? "Adding…" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
