import { useEffect, useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import { FieldLabel } from "@/core/components/FieldLabel";
import type {
  DirectorySchool,
  UpsertSchoolInput,
} from "@/features/directory/domain/directoryTypes";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";

interface SchoolFormDialogProps {
  school?: DirectorySchool | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: UpsertSchoolInput) => Promise<void>;
}

const inputClassName = FORM_FIELD_CLASS;

/** Modal form to create or update a school record. */
export function SchoolFormDialog({
  school,
  isSubmitting,
  onClose,
  onSubmit,
}: SchoolFormDialogProps) {
  const isEdit = school != null;
  const [name, setName] = useState(school?.name ?? "");
  const [code, setCode] = useState(school?.code ?? "");
  const [isActive, setIsActive] = useState(school?.isActive ?? true);
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

    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    if (!trimmedName || !trimmedCode) {
      setError("Name and code are required.");
      return;
    }

    try {
      await onSubmit({
        name: trimmedName,
        code: trimmedCode,
        isActive,
      });
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message ?? "Unable to save school.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="school-form-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="mb-6">
          <h2
            id="school-form-title"
            className="text-xl font-semibold text-slate-900"
          >
            {isEdit ? "Edit school" : "Create school"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {isEdit
              ? `Update details for ${school.name}.`
              : "Add a new school to the directory."}
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <FieldLabel htmlFor="school-name" required>
              Name
            </FieldLabel>
            <input
              id="school-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClassName}
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FieldLabel htmlFor="school-code" required>
              Code
            </FieldLabel>
            <input
              id="school-code"
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className={inputClassName}
              required
              disabled={isSubmitting}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              disabled={isSubmitting}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Active
          </label>

          <div className="flex justify-end gap-3 pt-2">
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
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Create school"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
