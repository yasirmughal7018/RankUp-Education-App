import { useEffect, useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import { FieldLabel } from "@/core/components/FieldLabel";
import type {
  CreateDirectoryParentInput,
  DirectoryParent,
  UpdateDirectoryParentInput,
} from "@/features/directory/domain/directoryTypes";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";

type ParentFormSubmit =
  | { mode: "create"; input: CreateDirectoryParentInput }
  | { mode: "edit"; input: UpdateDirectoryParentInput };

interface ParentFormDialogProps {
  parent?: DirectoryParent | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: ParentFormSubmit) => Promise<void>;
}

const inputClassName = FORM_FIELD_CLASS;

/** Modal form to create or update a parent account. */
export function ParentFormDialog({
  parent,
  isSubmitting,
  onClose,
  onSubmit,
}: ParentFormDialogProps) {
  const isEdit = parent != null;
  const [fullName, setFullName] = useState(parent?.fullName ?? "");
  const [username, setUsername] = useState(parent?.username ?? "");
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
    if (!trimmedName) {
      setError("Full name is required.");
      return;
    }

    const trimmedCnic = cnic.trim() || null;
    const mobile = mobileNumber.trim() || null;

    try {
      if (isEdit) {
        await onSubmit({
          mode: "edit",
          input: {
            fullName: trimmedName,
            cnic: trimmedCnic,
            mobileNumber: mobile,
          },
        });
      } else {
        const trimmedUsername = username.trim();
        if (!trimmedUsername) {
          setError("Username is required.");
          return;
        }
        await onSubmit({
          mode: "create",
          input: {
            fullName: trimmedName,
            username: trimmedUsername,
            cnic: trimmedCnic,
            mobileNumber: mobile,
          },
        });
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message ?? "Unable to save parent.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="parent-form-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="mb-6">
          <h2
            id="parent-form-title"
            className="text-xl font-semibold text-slate-900"
          >
            {isEdit ? "Edit parent" : "Create parent"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {isEdit
              ? `Update details for ${parent.fullName}.`
              : "Add a new parent to the directory. User must set password on first login."}
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <FieldLabel htmlFor="parent-full-name" required>
              Full name
            </FieldLabel>
            <input
              id="parent-full-name"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className={inputClassName}
              required
              disabled={isSubmitting}
            />
          </div>

          {!isEdit ? (
            <>
              <div>
                <FieldLabel htmlFor="parent-username" required>
                  Username
                </FieldLabel>
                <input
                  id="parent-username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className={inputClassName}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Username {parent.username}</p>
          )}

          <div>
            <FieldLabel htmlFor="parent-cnic" optional>
              CNIC
            </FieldLabel>
            <input
              id="parent-cnic"
              type="text"
              value={cnic}
              onChange={(event) => setCnic(event.target.value)}
              className={inputClassName}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FieldLabel htmlFor="parent-mobile" optional>
              Mobile
            </FieldLabel>
            <input
              id="parent-mobile"
              type="text"
              value={mobileNumber}
              onChange={(event) => setMobileNumber(event.target.value)}
              className={inputClassName}
              disabled={isSubmitting}
            />
          </div>

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
              {isSubmitting
                ? "Saving..."
                : isEdit
                  ? "Save changes"
                  : "Create parent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
