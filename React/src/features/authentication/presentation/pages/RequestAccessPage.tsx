import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import * as authApi from "@/features/authentication/data/authApi";
import type { RegisterAccountRequest } from "@/features/authentication/data/authApi";

const inputClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2";

const USER_TYPES = ["Student", "Parent", "Teacher"] as const;
const ADMIN_TARGETS = ["School Admin", "Portal Admin"] as const;

function parseOptionalId(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function RequestAccessPage() {
  const [form, setForm] = useState({
    fullName: "",
    mobileNumber: "",
    emailAddress: "",
    cnic: "",
    userType: "Student" as RegisterAccountRequest["userType"],
    schoolCampusName: "",
    schoolId: "",
    campusId: "",
    studentOrEmployeeId: "",
    adminTarget: "School Admin",
    reasonMessage: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const response = await authApi.registerAccount({
        fullName: form.fullName.trim(),
        mobileNumber: form.mobileNumber.trim(),
        emailAddress: form.emailAddress.trim() || null,
        userType: form.userType,
        schoolCampusName: form.schoolCampusName.trim() || null,
        studentOrEmployeeId: form.studentOrEmployeeId.trim() || null,
        adminTarget: form.adminTarget,
        reasonMessage: form.reasonMessage.trim() || null,
        schoolId: parseOptionalId(form.schoolId),
        campusId: parseOptionalId(form.campusId),
        cnic: form.cnic.trim() || null,
      });

      setSuccessMessage(
        `Request submitted for ${response.fullName}. Username will be ${response.username} after admin approval.`,
      );
      setForm({
        fullName: "",
        mobileNumber: "",
        emailAddress: "",
        cnic: "",
        userType: "Student",
        schoolCampusName: "",
        schoolId: "",
        campusId: "",
        studentOrEmployeeId: "",
        adminTarget: "School Admin",
        reasonMessage: "",
      });
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
          description="Creates a pending user only. School Admin and Super Admin receive in-app notifications to review your request. Accounts are not activated until approved."
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

          <div className="grid gap-4 sm:grid-cols-2">
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

            <div>
              <label htmlFor="adminTarget" className="mb-1 block text-sm font-medium text-slate-700">
                Admin target *
              </label>
              <select
                id="adminTarget"
                required
                disabled={isSubmitting}
                value={form.adminTarget}
                onChange={(event) => updateField("adminTarget", event.target.value)}
                className={inputClassName}
              >
                {ADMIN_TARGETS.map((target) => (
                  <option key={target} value={target}>
                    {target}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="schoolCampusName" className="mb-1 block text-sm font-medium text-slate-700">
              School / campus name (optional)
            </label>
            <input
              id="schoolCampusName"
              disabled={isSubmitting}
              value={form.schoolCampusName}
              onChange={(event) => updateField("schoolCampusName", event.target.value)}
              className={inputClassName}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="schoolId" className="mb-1 block text-sm font-medium text-slate-700">
                School ID
                {form.userType === "Student" || form.userType === "Teacher"
                  ? " (recommended)"
                  : " (optional)"}
              </label>
              <input
                id="schoolId"
                type="number"
                disabled={isSubmitting}
                value={form.schoolId}
                onChange={(event) => updateField("schoolId", event.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="campusId" className="mb-1 block text-sm font-medium text-slate-700">
                Campus ID
                {form.userType === "Student" || form.userType === "Teacher"
                  ? " (recommended)"
                  : " (optional)"}
              </label>
              <input
                id="campusId"
                type="number"
                disabled={isSubmitting}
                value={form.campusId}
                onChange={(event) => updateField("campusId", event.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label htmlFor="studentOrEmployeeId" className="mb-1 block text-sm font-medium text-slate-700">
              Student / employee ID (optional)
            </label>
            <input
              id="studentOrEmployeeId"
              disabled={isSubmitting}
              value={form.studentOrEmployeeId}
              onChange={(event) =>
                updateField("studentOrEmployeeId", event.target.value)
              }
              className={inputClassName}
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
