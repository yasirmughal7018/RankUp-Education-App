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
  const [cnic, setCnic] = useState(parent?.cnic ?? "");
  const [mobileNumber, setMobileNumber] = useState(parent?.mobileNumber ?? "");
  const alreadyCoordinator = (parent?.roles ?? []).includes("Coordinator");
  const [alsoCoordinator, setAlsoCoordinator] = useState(alreadyCoordinator);
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
            alsoCoordinator,
          },
        });
      } else {
        const trimmedEmail = username.trim();
        if (!trimmedEmail) {
          setError("Email address is required (it is the username).");
          return;
        }
        await onSubmit({
          mode: "create",
          input: {
            fullName: trimmedName,
            username: trimmedEmail,
            emailAddress: trimmedEmail,
            cnic: trimmedCnic,
            mobileNumber: mobile,
            alsoCoordinator,
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
              ? `Update details for ${parent.fullName}. You can also add Coordinator on this same login (with Teacher if already granted).`
              : "Add a parent to the directory. Optionally also assign Coordinator. Use + Teacher on the list to stack Teacher as well — one login can hold Teacher, Parent, and Coordinator."}
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
                  Email (username)
                </FieldLabel>
                <input
                  id="parent-username"
                  type="email"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className={inputClassName}
                  required
                  disabled={isSubmitting}
                  placeholder="you@example.com"
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

          <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <legend className="px-1 text-sm font-semibold text-slate-800">
              Additional roles on this account
            </legend>
            <p className="text-xs text-slate-600">
              Parent is always included. Check Coordinator here; add Teacher from
              the Parents list (+ Teacher) so one login can hold all three.
            </p>
            <label className="flex items-start gap-2.5 text-sm text-slate-800">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={alsoCoordinator}
                disabled={isSubmitting || alreadyCoordinator}
                onChange={(event) => setAlsoCoordinator(event.target.checked)}
              />
              <span>
                <span className="font-medium">Coordinator</span>
                {alreadyCoordinator ? (
                  <span className="text-slate-500"> — already assigned</span>
                ) : null}
              </span>
            </label>
          </fieldset>

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
