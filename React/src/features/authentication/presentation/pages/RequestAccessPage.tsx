import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
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

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
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
  }, [form.schoolId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const schoolId = form.schoolId ? Number(form.schoolId) : null;
    const campusId = form.campusId ? Number(form.campusId) : null;

    try {
      const response = await authApi.registerAccount({
        fullName: form.fullName.trim(),
        mobileNumber: form.mobileNumber.trim(),
        emailAddress: form.emailAddress.trim() || null,
        userType: form.userType,
        rollNumberTeacherCode: form.rollNumberTeacherCode.trim() || null,
        adminTarget: schoolId ? "School Admin" : "Portal Admin",
        reasonMessage: form.reasonMessage.trim() || null,
        schoolId,
        campusId: schoolId ? campusId : null,
        cnic: form.cnic.trim() || null,
      });

      const routing = schoolId
        ? "School Admin and Portal Admin"
        : "Portal Admin";

      setSuccessMessage(
        `Request submitted for ${response.fullName}. It will be reviewed by ${routing}. Username will be ${response.username} after approval.`,
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

  return (
    <div className="mx-auto flex max-w-6xl justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <PageHeader
          title="Request account access"
          description="Creates a pending user only. Leave School empty to send the request to Portal Admin. If you select a School, both School Admin and Portal Admin can approve it."
        />

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
            <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-slate-700">
              Full name *
            </label>
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
            <label htmlFor="mobileNumber" className="mb-1 block text-sm font-medium text-slate-700">
              Mobile number *
            </label>
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
            <label htmlFor="emailAddress" className="mb-1 block text-sm font-medium text-slate-700">
              Email (optional)
            </label>
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
            <label htmlFor="cnic" className="mb-1 block text-sm font-medium text-slate-700">
              CNIC (optional)
            </label>
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
            <label htmlFor="userType" className="mb-1 block text-sm font-medium text-slate-700">
              Account type *
            </label>
            <select
              id="userType"
              required
              disabled={isSubmitting}
              value={form.userType}
              onChange={(event) =>
                updateField(
                  "userType",
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="schoolId" className="mb-1 block text-sm font-medium text-slate-700">
                School
              </label>
              <select
                id="schoolId"
                disabled={isSubmitting || isLoadingSchools}
                value={form.schoolId}
                onChange={(event) => {
                  updateField("schoolId", event.target.value);
                  updateField("campusId", "");
                }}
                className={inputClassName}
              >
                <option value="">
                  {isLoadingSchools ? "Loading schools..." : "No school (Portal Admin)"}
                </option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Empty → Portal Admin only. Selected → School Admin + Portal Admin.
              </p>
            </div>

            <div>
              <label htmlFor="campusId" className="mb-1 block text-sm font-medium text-slate-700">
                Campus
              </label>
              <select
                id="campusId"
                disabled={isSubmitting || !form.schoolId || isLoadingCampuses}
                value={form.campusId}
                onChange={(event) => updateField("campusId", event.target.value)}
                className={inputClassName}
              >
                <option value="">
                  {!form.schoolId
                    ? "Select a school first"
                    : isLoadingCampuses
                      ? "Loading campuses..."
                      : "No campus"}
                </option>
                {campuses.map((campus) => (
                  <option key={campus.id} value={campus.id}>
                    {campus.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="rollNumberTeacherCode" className="mb-1 block text-sm font-medium text-slate-700">
              Roll number / teacher code (optional)
            </label>
            <input
              id="rollNumberTeacherCode"
              disabled={isSubmitting}
              value={form.rollNumberTeacherCode}
              onChange={(event) =>
                updateField("rollNumberTeacherCode", event.target.value)
              }
              className={inputClassName}
              placeholder="Student roll number or teacher code"
            />
          </div>

          <div>
            <label htmlFor="reasonMessage" className="mb-1 block text-sm font-medium text-slate-700">
              Reason (optional)
            </label>
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
