import { useEffect, useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import { FieldLabel } from "@/core/components/FieldLabel";
import type { CreateDirectoryTutorInput } from "@/features/directory/domain/directoryTypes";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";

interface TutorFormDialogProps {
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: CreateDirectoryTutorInput) => Promise<void>;
}

export function TutorFormDialog({
  isSubmitting,
  onClose,
  onSubmit,
}: TutorFormDialogProps) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [cnic, setCnic] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
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
    const trimmedName = fullName.trim();
    const trimmedEmail = username.trim();
    if (!trimmedName) {
      setError("Full name is required.");
      return;
    }
    if (!trimmedEmail) {
      setError("Email address is required (it is the username).");
      return;
    }

    try {
      await onSubmit({
        fullName: trimmedName,
        username: trimmedEmail,
        emailAddress: trimmedEmail,
        cnic: cnic.trim() || null,
        mobileNumber: mobileNumber.trim() || null,
      });
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message ?? "Unable to save tutor.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutor-form-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2
          id="tutor-form-title"
          className="text-xl font-semibold text-slate-900"
        >
          Create tutor
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Tutors are not tied to a school. They set a password on first login.
        </p>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form className="mt-5 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <FieldLabel htmlFor="tutor-full-name" required>
              Full name
            </FieldLabel>
            <input
              id="tutor-full-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className={FORM_FIELD_CLASS}
              required
              disabled={isSubmitting}
            />
          </div>
          <div>
            <FieldLabel htmlFor="tutor-username" required>
              Email (username)
            </FieldLabel>
            <input
              id="tutor-username"
              type="email"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className={FORM_FIELD_CLASS}
              required
              disabled={isSubmitting}
            />
          </div>
          <div>
            <FieldLabel htmlFor="tutor-cnic" optional>
              CNIC
            </FieldLabel>
            <input
              id="tutor-cnic"
              value={cnic}
              onChange={(event) => setCnic(event.target.value)}
              className={FORM_FIELD_CLASS}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <FieldLabel htmlFor="tutor-mobile" optional>
              Mobile
            </FieldLabel>
            <input
              id="tutor-mobile"
              value={mobileNumber}
              onChange={(event) => setMobileNumber(event.target.value)}
              className={FORM_FIELD_CLASS}
              disabled={isSubmitting}
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
              {isSubmitting ? "Saving..." : "Create tutor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
