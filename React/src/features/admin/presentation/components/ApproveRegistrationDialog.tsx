import { useEffect, useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import type {
  ApproveRegistrationRequest,
  PendingRegistration,
  RegistrationActionRole,
} from "@/features/admin/domain/registrationTypes";
import { getDefaultApprovalValues } from "@/features/admin/domain/registrationTypes";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";

interface ApproveRegistrationDialogProps {
  registration: PendingRegistration;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (
    registration: PendingRegistration,
    request: ApproveRegistrationRequest,
  ) => Promise<void>;
}

const inputClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2";

export function ApproveRegistrationDialog({
  registration,
  isSubmitting,
  onClose,
  onSubmit,
}: ApproveRegistrationDialogProps) {
  const { user } = useAuth();
  const defaults = getDefaultApprovalValues(registration, user);
  const [password, setPassword] = useState("");
  const [schoolId, setSchoolId] = useState(String(defaults.schoolId));
  const [campusId, setCampusId] = useState(String(defaults.campusId));
  const [studentRollNumber, setStudentRollNumber] = useState(
    defaults.studentOrEmployeeId,
  );
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState(defaults.section);
  const [teacherCode, setTeacherCode] = useState(defaults.studentOrEmployeeId);
  const [mobileNumber, setMobileNumber] = useState(defaults.mobileNumber);
  const [cnic, setCnic] = useState(defaults.cnic);
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

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    const request: ApproveRegistrationRequest = {
      password,
      mobileNumber: mobileNumber.trim() || registration.username,
      cnic: cnic.trim() || null,
    };

    const role = registration.role as RegistrationActionRole;

    if (role === "Student") {
      if (!schoolId || !campusId || !grade || !studentRollNumber.trim()) {
        setError("School, campus, grade, and roll number are required.");
        return;
      }

      request.schoolId = Number(schoolId);
      request.campusId = Number(campusId);
      request.grade = Number(grade);
      request.studentRollNumber = studentRollNumber.trim();
      request.section = section.trim() || "A";
    }

    if (role === "Teacher") {
      if (!schoolId || !campusId || !teacherCode.trim()) {
        setError("School, campus, and teacher code are required.");
        return;
      }

      request.schoolId = Number(schoolId);
      request.campusId = Number(campusId);
      request.teacherCode = teacherCode.trim();
    }

    try {
      await onSubmit(registration, request);
    } catch (caught) {
      const apiError = caught as ApiError;
      setError(apiError.message || "Unable to approve registration.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="approve-registration-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="mb-6">
          <h2
            id="approve-registration-title"
            className="text-xl font-semibold text-slate-900"
          >
            Approve registration
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {registration.fullName} ({registration.role}) — {registration.username}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Admin sets initial password; user must change it on first login
            (MustChangePassword).
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Initial password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClassName}
              minLength={6}
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="mobileNumber" className="mb-1 block text-sm font-medium text-slate-700">
              Mobile number
            </label>
            <input
              id="mobileNumber"
              type="text"
              value={mobileNumber}
              onChange={(event) => setMobileNumber(event.target.value)}
              className={inputClassName}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="cnic" className="mb-1 block text-sm font-medium text-slate-700">
              CNIC
            </label>
            <input
              id="cnic"
              type="text"
              value={cnic}
              onChange={(event) => setCnic(event.target.value)}
              className={inputClassName}
              disabled={isSubmitting}
              placeholder="Stored on user profile"
            />
          </div>

          {registration.role === "Student" || registration.role === "Teacher" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="schoolId" className="mb-1 block text-sm font-medium text-slate-700">
                  School ID
                </label>
                <input
                  id="schoolId"
                  type="number"
                  value={schoolId}
                  onChange={(event) => setSchoolId(event.target.value)}
                  className={inputClassName}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="campusId" className="mb-1 block text-sm font-medium text-slate-700">
                  Campus ID
                </label>
                <input
                  id="campusId"
                  type="number"
                  value={campusId}
                  onChange={(event) => setCampusId(event.target.value)}
                  className={inputClassName}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
          ) : null}

          {registration.role === "Student" ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label
                  htmlFor="studentRollNumber"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Roll number *
                </label>
                <input
                  id="studentRollNumber"
                  type="text"
                  value={studentRollNumber}
                  onChange={(event) => setStudentRollNumber(event.target.value)}
                  className={inputClassName}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="grade" className="mb-1 block text-sm font-medium text-slate-700">
                  Grade
                </label>
                <input
                  id="grade"
                  type="number"
                  value={grade}
                  onChange={(event) => setGrade(event.target.value)}
                  className={inputClassName}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="section" className="mb-1 block text-sm font-medium text-slate-700">
                  Section
                </label>
                <input
                  id="section"
                  type="text"
                  value={section}
                  onChange={(event) => setSection(event.target.value)}
                  className={inputClassName}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          ) : null}

          {registration.role === "Teacher" ? (
            <div>
              <label htmlFor="teacherCode" className="mb-1 block text-sm font-medium text-slate-700">
                Teacher code *
              </label>
              <input
                id="teacherCode"
                type="text"
                value={teacherCode}
                onChange={(event) => setTeacherCode(event.target.value)}
                className={inputClassName}
                required
                disabled={isSubmitting}
              />
            </div>
          ) : null}

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
              {isSubmitting ? "Approving..." : "Approve account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
