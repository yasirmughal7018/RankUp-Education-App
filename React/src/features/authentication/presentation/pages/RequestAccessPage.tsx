import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { FieldLabel } from "@/core/components/FieldLabel";
import { SearchableSelect } from "@/core/components/SearchableSelect";
import * as authApi from "@/features/authentication/data/authApi";
import type { RegisterAccountRequest } from "@/features/authentication/data/authApi";
import { AuthSplitLayout } from "@/features/authentication/presentation/components/AuthSplitLayout";

const inputClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2";

const USER_TYPES = ["Student", "Parent", "Teacher"] as const;

export function RequestAccessPage() {
  const [form, setForm] = useState({
    fullName: "",
    mobileNumber: "",
    emailAddress: "",
    cnic: "",
    userType: "Student" as RegisterAccountRequest["userType"],
    schoolId: "",
    campusId: "",
    rollNumberTeacherCode: "",
    reasonMessage: "",
  });
  const [schools, setSchools] = useState<authApi.RegistrationSchoolOption[]>([]);
  const [campuses, setCampuses] = useState<authApi.RegistrationCampusOption[]>([]);
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [isLoadingCampuses, setIsLoadingCampuses] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isParent = form.userType === "Parent";
  const isStudent = form.userType === "Student";
  const isTeacher = form.userType === "Teacher";
  const showSchoolFields = isStudent || isTeacher;

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleUserTypeChange(userType: RegisterAccountRequest["userType"]) {
    setForm((current) => ({
      ...current,
      userType,
      ...(userType === "Parent"
        ? { schoolId: "", campusId: "", rollNumberTeacherCode: "" }
        : {}),
    }));
    if (userType === "Parent") {
      setCampuses([]);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setIsLoadingSchools(true);
    void authApi
      .listRegistrationSchools()
      .then((items) => {
        if (!cancelled) {
          setSchools(items);
        }
      })
      .catch((caught: { message?: string }) => {
        if (!cancelled) {
          setError(caught.message || "Unable to load schools.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSchools(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isParent) {
      setCampuses([]);
      return;
    }

    const schoolId = Number(form.schoolId);
    if (!form.schoolId || !Number.isFinite(schoolId)) {
      setCampuses([]);
      return;
    }

    let cancelled = false;
    setIsLoadingCampuses(true);
    void authApi
      .listRegistrationCampuses(schoolId)
      .then((items) => {
        if (!cancelled) {
          setCampuses(items);
        }
      })
      .catch((caught: { message?: string }) => {
        if (!cancelled) {
          setError(caught.message || "Unable to load campuses.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingCampuses(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [form.schoolId, isParent]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (isStudent && !form.rollNumberTeacherCode.trim()) {
      setError("Roll number is required for Student account requests.");
      return;
    }

    if (form.campusId && !form.schoolId) {
      setError("School is required when a campus is selected.");
      return;
    }

    setIsSubmitting(true);

    const schoolId =
      isParent || !form.schoolId ? null : Number(form.schoolId);
    const campusId =
      isParent || !schoolId || !form.campusId ? null : Number(form.campusId);

    try {
      const response = await authApi.registerAccount({
        fullName: form.fullName.trim(),
        mobileNumber: form.mobileNumber.trim(),
        emailAddress: form.emailAddress.trim() || null,
        userType: form.userType,
        rollNumberTeacherCode: isParent
          ? null
          : form.rollNumberTeacherCode.trim() || null,
        reasonMessage: form.reasonMessage.trim() || null,
        schoolId,
        campusId,
        cnic: form.cnic.trim() || null,
      });

      const routing =
        schoolId && campusId
          ? "Campus Admin / School Admin (recorded) and Portal Admin (required to activate)"
          : schoolId
            ? "School Admin (recorded) and Portal Admin (required to activate)"
            : "Portal Admin";

      setSuccessMessage(
        `Request submitted for ${response.fullName}. It will be reviewed by ${routing}. After Portal Admin approval, set your initial password on the login screen, then sign in. Username will be ${response.username}.`,
      );
      setForm({
        fullName: "",
        mobileNumber: "",
        emailAddress: "",
        cnic: "",
        userType: "Student",
        schoolId: "",
        campusId: "",
        rollNumberTeacherCode: "",
        reasonMessage: "",
      });
      setCampuses([]);
    } catch (caught) {
      const apiError = caught as { message?: string };
      setError(apiError.message || "Unable to submit account request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const description = isParent
    ? "Parent requests go to Portal Admin. School and campus are not required."
    : "Optional school/campus routes approval. Only Portal Admin activates the account.";

  return (
    <AuthSplitLayout variant="request-access">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3">
          <Link
            to="/login"
            className="group mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 py-1 pl-1 pr-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition group-hover:bg-brand-600 group-hover:text-white group-hover:ring-brand-600">
              <svg
                viewBox="0 0 20 20"
                className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M11.78 4.22a.75.75 0 010 1.06L7.06 10l4.72 4.72a.75.75 0 11-1.06 1.06l-5.25-5.25a.75.75 0 010-1.06l5.25-5.25a.75.75 0 011.06 0z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            Back to login
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Request account access
          </h1>
          <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
        </div>

        {successMessage ? (
          <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            {successMessage}
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            {error}
          </div>
        ) : null}

        <form className="space-y-2.5" onSubmit={handleSubmit}>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="fullName" required>
                Full name
              </FieldLabel>
              <input
                id="fullName"
                required
                disabled={isSubmitting}
                value={form.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
                className={inputClassName}
              />
            </div>

            <div>
              <FieldLabel htmlFor="mobileNumber" required>
                Mobile number
              </FieldLabel>
              <input
                id="mobileNumber"
                required
                disabled={isSubmitting}
                value={form.mobileNumber}
                onChange={(event) =>
                  updateField("mobileNumber", event.target.value)
                }
                className={inputClassName}
                placeholder="+923001234567"
              />
            </div>

            <div>
              <FieldLabel htmlFor="emailAddress" optional>
                Email
              </FieldLabel>
              <input
                id="emailAddress"
                type="email"
                disabled={isSubmitting}
                value={form.emailAddress}
                onChange={(event) =>
                  updateField("emailAddress", event.target.value)
                }
                className={inputClassName}
              />
            </div>

            <div>
              <FieldLabel htmlFor="cnic" optional>
                CNIC
              </FieldLabel>
              <input
                id="cnic"
                disabled={isSubmitting}
                value={form.cnic}
                onChange={(event) => updateField("cnic", event.target.value)}
                className={inputClassName}
                placeholder="12345-1234567-1"
              />
            </div>

            <div>
              <FieldLabel htmlFor="userType" required>
                Account type
              </FieldLabel>
              <select
                id="userType"
                required
                disabled={isSubmitting}
                value={form.userType}
                onChange={(event) =>
                  handleUserTypeChange(
                    event.target.value as RegisterAccountRequest["userType"],
                  )
                }
                className={inputClassName}
              >
                {USER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {showSchoolFields ? (
              <div>
                <FieldLabel
                  htmlFor="rollNumberTeacherCode"
                  required={isStudent}
                  optional={isTeacher}
                >
                  {isTeacher ? "Teacher code" : "Roll number"}
                </FieldLabel>
                <input
                  id="rollNumberTeacherCode"
                  required={isStudent}
                  disabled={isSubmitting}
                  value={form.rollNumberTeacherCode}
                  onChange={(event) =>
                    updateField("rollNumberTeacherCode", event.target.value)
                  }
                  className={inputClassName}
                  placeholder={
                    isTeacher ? "Teacher code" : "Student roll number"
                  }
                />
              </div>
            ) : (
              <div className="hidden sm:block" aria-hidden />
            )}

            {showSchoolFields ? (
              <>
                <div>
                  <FieldLabel htmlFor="schoolId" optional>
                    School
                  </FieldLabel>
                  <SearchableSelect
                    id="schoolId"
                    disabled={isSubmitting || isLoadingSchools}
                    value={form.schoolId}
                    allowEmpty
                    emptyLabel={
                      isLoadingSchools ? "Loading schools..." : "Select school"
                    }
                    placeholder={
                      isLoadingSchools ? "Loading schools..." : "Select school"
                    }
                    options={schools.map((school) => ({
                      value: String(school.id),
                      label: school.name,
                    }))}
                    onChange={(next) => {
                      updateField("schoolId", next);
                      updateField("campusId", "");
                    }}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="campusId" optional>
                    Campus
                  </FieldLabel>
                  <SearchableSelect
                    id="campusId"
                    disabled={
                      isSubmitting || !form.schoolId || isLoadingCampuses
                    }
                    value={form.campusId}
                    allowEmpty
                    emptyLabel={
                      !form.schoolId
                        ? "Select a school first"
                        : isLoadingCampuses
                          ? "Loading campuses..."
                          : "Select campus"
                    }
                    placeholder={
                      !form.schoolId
                        ? "Select a school first"
                        : isLoadingCampuses
                          ? "Loading campuses..."
                          : "Select campus"
                    }
                    options={campuses.map((campus) => ({
                      value: String(campus.id),
                      label: campus.name,
                    }))}
                    onChange={(next) => updateField("campusId", next)}
                  />
                </div>
              </>
            ) : null}
          </div>

          <div>
            <FieldLabel htmlFor="reasonMessage" optional>
              Reason
            </FieldLabel>
            <textarea
              id="reasonMessage"
              rows={2}
              disabled={isSubmitting}
              value={form.reasonMessage}
              onChange={(event) =>
                updateField("reasonMessage", event.target.value)
              }
              className={inputClassName}
              placeholder="Please create my account."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Submitting..." : "Submit request"}
          </button>
        </form>

        <p className="mt-3 text-center text-xs text-slate-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-brand-700 hover:text-brand-800"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
