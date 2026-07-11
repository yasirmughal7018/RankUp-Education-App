import { useEffect, useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import { FieldLabel } from "@/core/components/FieldLabel";
import type {
  CreateDirectoryCampusAdminInput,
  DirectoryCampus,
  DirectoryCampusAdmin,
  DirectorySchool,
  UpdateDirectoryCampusAdminInput,
} from "@/features/directory/domain/directoryTypes";
import { useDirectoryCampusesQuery } from "@/features/directory/presentation/hooks/useDirectoryQueries";

type CampusAdminFormSubmit =
  | { mode: "create"; input: CreateDirectoryCampusAdminInput }
  | { mode: "edit"; input: UpdateDirectoryCampusAdminInput };

interface CampusAdminFormDialogProps {
  campusAdmin?: DirectoryCampusAdmin | null;
  schools: DirectorySchool[];
  /** When set, school is fixed (SchoolAdmin managing their own school). */
  lockSchoolId?: number | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CampusAdminFormSubmit) => Promise<void>;
}

const inputClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2";

export function CampusAdminFormDialog({
  campusAdmin,
  schools,
  lockSchoolId = null,
  isSubmitting,
  onClose,
  onSubmit,
}: CampusAdminFormDialogProps) {
  const isEdit = campusAdmin != null;
  const schoolLocked = lockSchoolId != null && lockSchoolId > 0;

  const [fullName, setFullName] = useState(campusAdmin?.fullName ?? "");
  const [username, setUsername] = useState(campusAdmin?.username ?? "");
  const [schoolId, setSchoolId] = useState(
    schoolLocked
      ? String(lockSchoolId)
      : campusAdmin?.schoolId
        ? String(campusAdmin.schoolId)
        : "",
  );
  const [campusId, setCampusId] = useState(
    campusAdmin?.campusId ? String(campusAdmin.campusId) : "",
  );
  const [mobileNumber, setMobileNumber] = useState(
    campusAdmin?.mobileNumber ?? "",
  );
  const [cnic, setCnic] = useState(campusAdmin?.cnic ?? "");
  const [emailAddress, setEmailAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedSchoolId = Number(schoolId) || 0;
  const { data: campuses = [], isLoading: campusesLoading } =
    useDirectoryCampusesQuery(selectedSchoolId, selectedSchoolId > 0);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isSubmitting, onClose]);

  useEffect(() => {
    if (!isEdit && !schoolLocked) {
      setCampusId("");
    }
  }, [schoolId, isEdit, schoolLocked]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const parsedSchoolId = schoolLocked ? lockSchoolId! : Number(schoolId);
    const parsedCampusId = Number(campusId);

    if (!trimmedName) {
      setError("Full name is required.");
      return;
    }
    if (!parsedSchoolId || parsedSchoolId < 1) {
      setError("Select a school.");
      return;
    }
    if (!parsedCampusId || parsedCampusId < 1) {
      setError("Select a campus.");
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
            campusId: parsedCampusId,
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
            campusId: parsedCampusId,
            mobileNumber: mobile,
            cnic: trimmedCnic,
            emailAddress: email,
          },
        });
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message ?? "Unable to save campus admin.");
    }
  }

  const lockedSchoolName =
    schools.find((school) => school.id === lockSchoolId)?.name ??
    campusAdmin?.schoolName ??
    (schoolLocked ? `School #${lockSchoolId}` : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="campus-admin-form-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="mb-6">
          <h2
            id="campus-admin-form-title"
            className="text-xl font-semibold text-slate-900"
          >
            {isEdit ? "Edit campus admin" : "Create campus admin"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {isEdit
              ? `Update details for ${campusAdmin.fullName}.`
              : "Add a new campus admin. User must set password on first login."}
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <FieldLabel htmlFor="campus-admin-full-name" required>
              Full name
            </FieldLabel>
            <input
              id="campus-admin-full-name"
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
              <FieldLabel htmlFor="campus-admin-username" required>
                Username
              </FieldLabel>
              <input
                id="campus-admin-username"
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
              Username {campusAdmin.username}
            </p>
          )}

          {schoolLocked ? (
            <div>
              <FieldLabel htmlFor="campus-admin-school-locked" required>
                School
              </FieldLabel>
              <input
                id="campus-admin-school-locked"
                type="text"
                value={lockedSchoolName ?? ""}
                className={inputClassName}
                disabled
                readOnly
              />
            </div>
          ) : (
            <div>
              <FieldLabel htmlFor="campus-admin-school" required>
                School
              </FieldLabel>
              <select
                id="campus-admin-school"
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
          )}

          <div>
            <FieldLabel htmlFor="campus-admin-campus" required>
              Campus
            </FieldLabel>
            <select
              id="campus-admin-campus"
              value={campusId}
              onChange={(event) => setCampusId(event.target.value)}
              className={inputClassName}
              required
              disabled={
                isSubmitting ||
                (!schoolLocked && !selectedSchoolId) ||
                campusesLoading
              }
            >
              <option value="">
                {campusesLoading ? "Loading campuses..." : "Select campus"}
              </option>
              {(isEdit
                ? campuses.length > 0
                  ? campuses
                  : ([
                      {
                        id: campusAdmin.campusId,
                        name: campusAdmin.campusName || `Campus ${campusAdmin.campusId}`,
                      },
                    ] as Pick<DirectoryCampus, "id" | "name">[])
                : campuses
              ).map((campus) => (
                <option key={campus.id} value={campus.id}>
                  {campus.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel htmlFor="campus-admin-mobile" optional>
              Mobile
            </FieldLabel>
            <input
              id="campus-admin-mobile"
              type="text"
              value={mobileNumber}
              onChange={(event) => setMobileNumber(event.target.value)}
              className={inputClassName}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FieldLabel htmlFor="campus-admin-cnic" optional>
              CNIC
            </FieldLabel>
            <input
              id="campus-admin-cnic"
              type="text"
              value={cnic}
              onChange={(event) => setCnic(event.target.value)}
              className={inputClassName}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FieldLabel htmlFor="campus-admin-email" optional>
              Email
            </FieldLabel>
            <input
              id="campus-admin-email"
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
                  : "Create campus admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
