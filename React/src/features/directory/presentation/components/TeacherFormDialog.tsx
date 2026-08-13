import { useEffect, useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import { FieldLabel } from "@/core/components/FieldLabel";
import type {
  CreateDirectoryTeacherInput,
  DirectoryCampus,
  DirectorySchool,
  DirectoryTeacher,
  TeacherClassSection,
  UpdateDirectoryTeacherInput,
} from "@/features/directory/domain/directoryTypes";
import { useDirectoryCampusesQuery } from "@/features/directory/presentation/hooks/useDirectoryQueries";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";

type TeacherFormSubmit =
  | { mode: "create"; input: CreateDirectoryTeacherInput }
  | { mode: "edit"; input: UpdateDirectoryTeacherInput };

interface TeacherFormDialogProps {
  teacher?: DirectoryTeacher | null;
  schools: DirectorySchool[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: TeacherFormSubmit) => Promise<void>;
}

const inputClassName = FORM_FIELD_CLASS;

function emptyClassSection(): TeacherClassSection {
  return { grade: 0, section: "" };
}

/** Modal form to create or update a teacher with school/campus assignment. */
export function TeacherFormDialog({
  teacher,
  schools,
  isSubmitting,
  onClose,
  onSubmit,
}: TeacherFormDialogProps) {
  const isEdit = teacher != null;
  const [fullName, setFullName] = useState(teacher?.fullName ?? "");
  const [username, setUsername] = useState(teacher?.username ?? "");
  const [schoolId, setSchoolId] = useState(
    teacher?.schoolId ? String(teacher.schoolId) : "",
  );
  const [campusId, setCampusId] = useState(
    teacher?.campusId ? String(teacher.campusId) : "",
  );
  const [teacherCode, setTeacherCode] = useState(teacher?.teacherCode ?? "");
  const [mobileNumber, setMobileNumber] = useState(teacher?.mobileNumber ?? "");
  const [classSections, setClassSections] = useState<TeacherClassSection[]>(
    teacher?.classSections?.length
      ? teacher.classSections.map((item) => ({
          grade: item.grade,
          section: item.section,
        }))
      : [emptyClassSection()],
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

  function updateClassSection(
    index: number,
    patch: Partial<TeacherClassSection>,
  ) {
    setClassSections((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedCode = teacherCode.trim();
    const parsedCampusId = Number(campusId);

    if (!trimmedName || !trimmedCode) {
      setError("Name and teacher code are required.");
      return;
    }
    if (!parsedCampusId || parsedCampusId < 1) {
      setError("Select a campus.");
      return;
    }

    const normalizedSections = classSections
      .map((item) => ({
        grade: Number(item.grade) || 0,
        section: item.section.trim(),
      }))
      .filter((item) => item.grade > 0 && item.section.length > 0);

    if (normalizedSections.length === 0) {
      setError("Add at least one class (grade) and section.");
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
            classSections: normalizedSections,
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
            classSections: normalizedSections,
          },
        });
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message ?? "Unable to save teacher.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-form-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="mb-6">
          <h2
            id="teacher-form-title"
            className="text-xl font-semibold text-slate-900"
          >
            {isEdit ? "Edit teacher" : "Create teacher"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {isEdit
              ? `Update details for ${teacher.fullName}. Assign the classes and sections they teach.`
              : "Add a teacher and the class/section combinations they teach. Students in those classes appear on their roster automatically."}
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <FieldLabel htmlFor="teacher-full-name" required>
              Full name
            </FieldLabel>
            <input
              id="teacher-full-name"
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
                <FieldLabel htmlFor="teacher-username" required>
                  Email (username)
                </FieldLabel>
                <input
                  id="teacher-username"
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
                <FieldLabel htmlFor="teacher-school" required>
                  School
                </FieldLabel>
                <select
                  id="teacher-school"
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
              Username {teacher.username} · {teacher.schoolName || "—"}
            </p>
          )}

          <div>
            <FieldLabel htmlFor="teacher-campus" required>
              Campus
            </FieldLabel>
            <select
              id="teacher-campus"
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
                        id: teacher.campusId,
                        name: teacher.campusName || "Current campus",
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
            <FieldLabel htmlFor="teacher-code" required>
              Teacher code
            </FieldLabel>
            <input
              id="teacher-code"
              type="text"
              value={teacherCode}
              onChange={(event) => setTeacherCode(event.target.value)}
              className={inputClassName}
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <FieldLabel htmlFor="teacher-mobile" optional>
              Mobile
            </FieldLabel>
            <input
              id="teacher-mobile"
              type="text"
              value={mobileNumber}
              onChange={(event) => setMobileNumber(event.target.value)}
              className={inputClassName}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  Classes & sections
                </p>
                <p className="text-xs text-slate-500">
                  Teachers may have multiple class/section pairs.
                </p>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  setClassSections((current) => [...current, emptyClassSection()])
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
              >
                Add
              </button>
            </div>

            {classSections.map((item, index) => (
              <div
                key={`class-section-${index}`}
                className="grid grid-cols-[1fr_1fr_auto] gap-2"
              >
                <input
                  type="number"
                  min={1}
                  placeholder="Grade"
                  value={item.grade || ""}
                  onChange={(event) =>
                    updateClassSection(index, {
                      grade: Number(event.target.value) || 0,
                    })
                  }
                  className={inputClassName}
                  disabled={isSubmitting}
                  aria-label={`Grade ${index + 1}`}
                />
                <input
                  type="text"
                  placeholder="Section"
                  value={item.section}
                  onChange={(event) =>
                    updateClassSection(index, { section: event.target.value })
                  }
                  className={inputClassName}
                  disabled={isSubmitting}
                  aria-label={`Section ${index + 1}`}
                />
                <button
                  type="button"
                  disabled={isSubmitting || classSections.length <= 1}
                  onClick={() =>
                    setClassSections((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                  aria-label={`Remove class section ${index + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
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
                  : "Create teacher"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
