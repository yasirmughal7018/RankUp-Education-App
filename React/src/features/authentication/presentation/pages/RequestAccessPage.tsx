import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { FieldLabel } from "@/core/components/FieldLabel";
import { PageHeader } from "@/core/components/PageHeader";
import { SearchableSelect } from "@/core/components/SearchableSelect";
import * as authApi from "@/features/authentication/data/authApi";
import type { RegisterAccountRequest } from "@/features/authentication/data/authApi";

const inputClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2";

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

    if (isStudent) {
      if (!form.schoolId) {
        setError("School is required for Student account requests.");
        return;
      }
      if (!form.campusId) {
        setError("Campus is required for Student account requests.");
        return;
      }
      if (!form.rollNumberTeacherCode.trim()) {
        setError("Roll number is required for Student account requests.");
        return;
      }
    }

    if (isTeacher) {
      if (!form.schoolId) {
        setError("School is required for Teacher account requests.");
        return;
      }
      if (!form.campusId) {
        setError("Campus is required for Teacher account requests.");
        return;
      }
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
        adminTarget:
          schoolId && campusId
            ? "Campus Admin"
            : schoolId
              ? "School Admin"
              : "Portal Admin",
        reasonMessage: form.reasonMessage.trim() || null,
        schoolId,
        campusId,
        cnic: form.cnic.trim() || null,
      });

      const routing =
        schoolId && campusId
          ? "Campus Admin, School Admin, or Portal Admin (any one approval activates the account)"
          : "Portal Admin";

      setSuccessMessage(
        `Request submitted for ${response.fullName}. It will be reviewed by ${routing}. After approval, set your initial password on the login screen, then sign in. Username will be ${response.username}.`,
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
    ? "Parent requests go to Portal Admin. School, campus, and roll number are not required."
    : isTeacher
      ? "Teachers must select school and campus. Teacher code is optional. Campus Admin, School Admin, or Portal Admin can approve — any one approval activates the account so you can set your initial password."
      : "Students must select school and campus and enter a roll number. Campus Admin, School Admin, or Portal Admin can approve — any one approval activates the account so you can set your initial password.";

  return (
    <div className="mx-auto flex max-w-6xl justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <PageHeader title="Request account access" description={description} />

        {successMessage ? (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {successMessage}
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
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
              onChange={(event) => updateField("mobileNumber", event.target.value)}
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
              onChange={(event) => updateField("emailAddress", event.target.value)}
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
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="schoolId" required>
                    School
                  </FieldLabel>
                  <SearchableSelect
                    id="schoolId"
                    required
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
                  <FieldLabel htmlFor="campusId" required>
                    Campus
                  </FieldLabel>
                  <SearchableSelect
                    id="campusId"
                    required
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
              </div>

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
            </>
          ) : null}

          <div>
            <FieldLabel htmlFor="reasonMessage" optional>
              Reason
            </FieldLabel>
            <textarea
              id="reasonMessage"
              rows={3}
              disabled={isSubmitting}
              value={form.reasonMessage}
              onChange={(event) => updateField("reasonMessage", event.target.value)}
              className={inputClassName}
              placeholder="Please create my account."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Submitting..." : "Submit request"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-brand-700 hover:text-brand-800"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
