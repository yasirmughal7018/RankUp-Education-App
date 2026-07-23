import { useEffect, useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import { FieldLabel } from "@/core/components/FieldLabel";
import type {
  CreateDirectorySchoolAdminInput,
  DirectorySchool,
  DirectorySchoolAdmin,
  UpdateDirectorySchoolAdminInput,
} from "@/features/directory/domain/directoryTypes";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";

type SchoolAdminFormSubmit =
  | { mode: "create"; input: CreateDirectorySchoolAdminInput }
  | { mode: "edit"; input: UpdateDirectorySchoolAdminInput };

interface SchoolAdminFormDialogProps {
  schoolAdmin?: DirectorySchoolAdmin | null;
  schools: DirectorySchool[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: SchoolAdminFormSubmit) => Promise<void>;
}

const inputClassName = FORM_FIELD_CLASS;

/** Modal form to create or update a school admin account. */
export function SchoolAdminFormDialog({
  schoolAdmin,
  schools,
  isSubmitting,
  onClose,
  onSubmit,
}: SchoolAdminFormDialogProps) {
  const isEdit = schoolAdmin != null;
  const [fullName, setFullName] = useState(schoolAdmin?.fullName ?? "");
  const [username, setUsername] = useState(schoolAdmin?.username ?? "");
  const [schoolId, setSchoolId] = useState(
    schoolAdmin?.schoolId ? String(schoolAdmin.schoolId) : "",
  );
  const [mobileNumber, setMobileNumber] = useState(
    schoolAdmin?.mobileNumber ?? "",
  );
  const [cnic, setCnic] = useState(schoolAdmin?.cnic ?? "");
  const [emailAddress, setEmailAddress] = useState(
    schoolAdmin?.emailAddress ?? "",
  );
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
    const parsedSchoolId = Number(schoolId);
    if (!trimmedName) {
      setError("Full name is required.");
      return;
    }
    if (!parsedSchoolId || parsedSchoolId < 1) {
      setError("Select a school.");
      return;
    }

    const mobile = mobileNumber.trim() || null;
    const trimmedCnic = cnic.trim() || null;
    const email = emailAddress.trim() || null;

    try {
      if (isEdit) {
        await onSubmit({
          mode: "edit",
          input: {
            fullName: trimmedName,
            schoolId: parsedSchoolId,
            mobileNumber: mobile,
            cnic: trimmedCnic,
            emailAddress: email,
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
            schoolId: parsedSchoolId,
            mobileNumber: mobile,
            cnic: trimmedCnic,
            emailAddress: email,
          },
        });
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message ?? "Unable to save school admin.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="school-admin-form-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="mb-6">
          <h2
            id="school-admin-form-title"
            className="text-xl font-semibold text-slate-900"
          >
            {isEdit ? "Edit school admin" : "Create school admin"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {isEdit
              ? `Update details for ${schoolAdmin.fullName}.`
              : "Add a new school admin. User must set password on first login."}
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <FieldLabel htmlFor="school-admin-full-name" required>
              Full name
            </FieldLabel>
            <input
              id="school-admin-full-name"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className={inputClassName}
              required
              disabled={isSubmitting}
            />
          </div>

          {!isEdit ? (
            <div>
              <FieldLabel htmlFor="school-admin-username" required>
                Username
              </FieldLabel>
              <input
                id="school-admin-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className={inputClassName}
                required
                disabled={isSubmitting}
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Username {schoolAdmin.username}
            </p>
          )}

          <div>
            <FieldLabel htmlFor="school-admin-school" required>
              School
            </FieldLabel>
            <select
              id="school-admin-school"
              value={schoolId}
              onChange={(event) => setSchoolId(event.target.value)}
              className={inputClassName}
              required
              disabled={isSubmitting}
            >
              <option value="">Select school</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel htmlFor="school-admin-mobile" optional>
              Mobile
            </FieldLabel>
            <input
              id="school-admin-mobile"
              type="text"
              value={mobileNumber}
              onChange={(event) => setMobileNumber(event.target.value)}
              className={inputClassName}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FieldLabel htmlFor="school-admin-cnic" optional>
              CNIC
            </FieldLabel>
            <input
              id="school-admin-cnic"
              type="text"
              value={cnic}
              onChange={(event) => setCnic(event.target.value)}
              className={inputClassName}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FieldLabel htmlFor="school-admin-email" optional>
              Email
            </FieldLabel>
            <input
              id="school-admin-email"
              type="email"
              value={emailAddress}
              onChange={(event) => setEmailAddress(event.target.value)}
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
                  : "Create school admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
