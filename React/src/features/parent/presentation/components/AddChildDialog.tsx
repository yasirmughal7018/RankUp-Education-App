import { useEffect, useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";

interface AddChildDialogProps {
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (identifier: string, relationship: string) => Promise<void>;
}

/** Parent self-link: find a student by CNIC or username. */
export function AddChildDialog({
  isSubmitting,
  onClose,
  onSubmit,
}: AddChildDialogProps) {
  const [identifier, setIdentifier] = useState("");
  const [relationship, setRelationship] = useState("Guardian");
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
      await onSubmit(trimmed, relationship.trim() || "Guardian");
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message ?? "Unable to link child.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Add child</h2>
        <p className="mt-1 text-sm text-slate-600">
          Enter your child’s CNIC or username to link their student account.
        </p>

        <form className="mt-5 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">
              CNIC or username
            </span>
            <input
              type="text"
              autoFocus
              autoComplete="off"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. 42101-1234567-1 or student@school.edu"
              className={FORM_FIELD_CLASS}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">
              Relationship
            </span>
            <input
              type="text"
              value={relationship}
              onChange={(event) => setRelationship(event.target.value)}
              disabled={isSubmitting}
              placeholder="Guardian"
              className={FORM_FIELD_CLASS}
            />
          </label>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

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
              {isSubmitting ? "Linking…" : "Link child"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
