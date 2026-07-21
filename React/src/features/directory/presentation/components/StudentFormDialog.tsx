import { useEffect, useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import { FieldLabel } from "@/core/components/FieldLabel";
import type {
  CreateDirectoryStudentInput,
  DirectoryCampus,
  DirectorySchool,
  DirectoryStudent,
  UpdateDirectoryStudentInput,
} from "@/features/directory/domain/directoryTypes";
import { useDirectoryCampusesQuery } from "@/features/directory/presentation/hooks/useDirectoryQueries";

type StudentFormSubmit =
  | { mode: "create"; input: CreateDirectoryStudentInput }
  | { mode: "edit"; input: UpdateDirectoryStudentInput };

interface StudentFormDialogProps {
  student?: DirectoryStudent | null;
  schools: DirectorySchool[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: StudentFormSubmit) => Promise<void>;
}

const inputClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2";

/** Modal form to create or update a student with school/campus placement. */
export function StudentFormDialog({
  student,
  schools,
  isSubmitting,
  onClose,
  onSubmit,
}: StudentFormDialogProps) {
  const isEdit = student != null;
  const [fullName, setFullName] = useState(student?.fullName ?? "");
  const [username, setUsername] = useState(student?.username ?? "");
  const [schoolId, setSchoolId] = useState(
    student?.schoolId ? String(student.schoolId) : "",
  );
  const [campusId, setCampusId] = useState(
    student?.campusId ? String(student.campusId) : "",
  );
  const [rollNumber, setRollNumber] = useState(student?.rollNumber ?? "");
  const [grade, setGrade] = useState(student?.grade ? String(student.grade) : "");
  const [section, setSection] = useState(student?.section ?? "");
  const [mobileNumber, setMobileNumber] = useState("");
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
    const trimmedRoll = rollNumber.trim();
    const trimmedSection = section.trim();
    const parsedCampusId = Number(campusId);
    const parsedGrade = Number(grade);

    if (!trimmedName || !trimmedRoll || !trimmedSection) {
      setError("Name, roll number, and section are required.");
      return;
    }
    if (!parsedCampusId || parsedCampusId < 1) {
      setError("Select a campus.");
      return;
    }
    if (!parsedGrade || parsedGrade < 1) {
      setError("Enter a valid grade.");
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
            rollNumber: trimmedRoll,
            grade: parsedGrade,
            section: trimmedSection,
            mobileNumber: mobile,
          },
        });
      } else {
        const trimmedUsername = username.trim();
        const parsedSchoolId = Number(schoolId);
        if (!trimmedUsername) {
          setError("Username is required.");
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
            username: trimmedUsername,
            schoolId: parsedSchoolId,
            campusId: parsedCampusId,
            rollNumber: trimmedRoll,
            grade: parsedGrade,
            section: trimmedSection,
            mobileNumber: mobile,
          },
        });
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message ?? "Unable to save student.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-form-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="mb-6">
          <h2
            id="student-form-title"
            className="text-xl font-semibold text-slate-900"
          >
            {isEdit ? "Edit student" : "Create student"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {isEdit
              ? `Update details for ${student.fullName}.`
              : "Add a new student to the directory. User must set password on first login."}
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <FieldLabel htmlFor="student-full-name" required>
              Full name
            </FieldLabel>
            <input
              id="student-full-name"
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
                <FieldLabel htmlFor="student-username" required>
                  Username
                </FieldLabel>
                <input
                  id="student-username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className={inputClassName}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <FieldLabel htmlFor="student-school" required>
                  School
                </FieldLabel>
                <select
                  id="student-school"
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
              Username {student.username} · School ID {student.schoolId}
            </p>
          )}

          <div>
            <FieldLabel htmlFor="student-campus" required>
              Campus
            </FieldLabel>
            <select
              id="student-campus"
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
                        id: student.campusId,
                        name: `Campus ${student.campusId}`,
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

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <FieldLabel htmlFor="student-roll" required>
                Roll number
              </FieldLabel>
              <input
                id="student-roll"
                type="text"
                value={rollNumber}
                onChange={(event) => setRollNumber(event.target.value)}
                className={inputClassName}
                required
                disabled={isSubmitting}
              />
            </div>
            <div>
              <FieldLabel htmlFor="student-grade" required>
                Grade
              </FieldLabel>
              <input
                id="student-grade"
                type="number"
                min={1}
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                className={inputClassName}
                required
                disabled={isSubmitting}
              />
            </div>
            <div>
              <FieldLabel htmlFor="student-section" required>
                Section
              </FieldLabel>
              <input
                id="student-section"
                type="text"
                value={section}
                onChange={(event) => setSection(event.target.value)}
                className={inputClassName}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="student-mobile" optional>
              Mobile
            </FieldLabel>
            <input
              id="student-mobile"
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
                  : "Create student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
