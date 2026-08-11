import { useEffect, useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import { FieldLabel } from "@/core/components/FieldLabel";
import type {
  CreateDirectoryCoordinatorInput,
  DirectoryCampus,
  DirectoryCoordinator,
  DirectorySchool,
  UpdateDirectoryCoordinatorInput,
} from "@/features/directory/domain/directoryTypes";
import { useDirectoryCampusesQuery } from "@/features/directory/presentation/hooks/useDirectoryQueries";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";

type CoordinatorFormSubmit =
  | { mode: "create"; input: CreateDirectoryCoordinatorInput }
  | { mode: "edit"; input: UpdateDirectoryCoordinatorInput };

interface CoordinatorFormDialogProps {
  coordinator?: DirectoryCoordinator | null;
  schools: DirectorySchool[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CoordinatorFormSubmit) => Promise<void>;
}

const inputClassName = FORM_FIELD_CLASS;

/** Modal form to create or update a coordinator with school/campus assignment. */
export function CoordinatorFormDialog({
  coordinator,
  schools,
  isSubmitting,
  onClose,
  onSubmit,
}: CoordinatorFormDialogProps) {
  const isEdit = coordinator != null;
  const [fullName, setFullName] = useState(coordinator?.fullName ?? "");
  const [username, setUsername] = useState(coordinator?.username ?? "");
  const [schoolId, setSchoolId] = useState(
    coordinator?.schoolId ? String(coordinator.schoolId) : "",
  );
  const [campusId, setCampusId] = useState(
    coordinator?.campusId ? String(coordinator.campusId) : "",
  );
  const [teacherCode, setTeacherCode] = useState(
    coordinator?.teacherCode ?? "",
  );
  const [mobileNumber, setMobileNumber] = useState(
    coordinator?.mobileNumber ?? "",
  );
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
    if (!isEdit) {
      setCampusId("");
    }
  }, [schoolId, isEdit]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedCode = teacherCode.trim();
    const parsedCampusId = Number(campusId);

    if (!trimmedName || !trimmedCode) {
      setError("Name and coordinator code are required.");
      return;
    }
    if (!parsedCampusId || parsedCampusId < 1) {
      setError("Select a campus.");
      return;
    }

    const mobile = mobileNumber.trim() || null;

    try {
      if (isEdit) {
        await onSubmit({
          mode: "edit",
          input: {
            fullName: trimmedName,
            campusId: parsedCampusId,
            teacherCode: trimmedCode,
            mobileNumber: mobile,
          },
        });
      } else {
        const trimmedEmail = username.trim();
        const parsedSchoolId = Number(schoolId);
        if (!trimmedEmail) {
          setError("Email address is required (it is the username).");
          return;
        }
        if (!parsedSchoolId || parsedSchoolId < 1) {
          setError("Select a school.");
          return;
        }
        await onSubmit({
          mode: "create",
          input: {
            fullName: trimmedName,
            username: trimmedEmail,
            emailAddress: trimmedEmail,
            schoolId: parsedSchoolId,
            campusId: parsedCampusId,
            teacherCode: trimmedCode,
            mobileNumber: mobile,
          },
        });
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message ?? "Unable to save coordinator.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="coordinator-form-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="mb-6">
          <h2
            id="coordinator-form-title"
            className="text-xl font-semibold text-slate-900"
          >
            {isEdit ? "Edit coordinator" : "Create coordinator"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {isEdit
              ? `Update details for ${coordinator.fullName}.`
              : "Add a coordinator to the directory. User must set password on first login. Extra roles can be added later from the Coordinators list."}
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <FieldLabel htmlFor="coordinator-full-name" required>
              Full name
            </FieldLabel>
            <input
              id="coordinator-full-name"
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
                <FieldLabel htmlFor="coordinator-username" required>
                  Email (username)
                </FieldLabel>
                <input
                  id="coordinator-username"
                  type="email"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className={inputClassName}
                  required
                  disabled={isSubmitting}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <FieldLabel htmlFor="coordinator-school" required>
                  School
                </FieldLabel>
                <select
                  id="coordinator-school"
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
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Username {coordinator.username} · {coordinator.schoolName || "—"}
            </p>
          )}

          <div>
            <FieldLabel htmlFor="coordinator-campus" required>
              Campus
            </FieldLabel>
            <select
              id="coordinator-campus"
              value={campusId}
              onChange={(event) => setCampusId(event.target.value)}
              className={inputClassName}
              required
              disabled={
                isSubmitting ||
                (!isEdit && !selectedSchoolId) ||
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
                        id: coordinator.campusId,
                        name: coordinator.campusName || "Current campus",
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
            <FieldLabel htmlFor="coordinator-code" required>
              Coordinator code
            </FieldLabel>
            <input
              id="coordinator-code"
              type="text"
              value={teacherCode}
              onChange={(event) => setTeacherCode(event.target.value)}
              className={inputClassName}
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FieldLabel htmlFor="coordinator-mobile" optional>
              Mobile
            </FieldLabel>
            <input
              id="coordinator-mobile"
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
                  : "Create coordinator"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
