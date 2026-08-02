import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FieldLabel } from "@/core/components/FieldLabel";
import { PageHeader } from "@/core/components/PageHeader";
import * as authApi from "@/features/authentication/data/authApi";
import { AuthSplitLayout } from "@/features/authentication/presentation/components/AuthSplitLayout";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";

const inputClassName = FORM_FIELD_CLASS;

/** Completes forgot-password using the emailed token. */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(
    () => searchParams.get("token")?.trim() ?? "",
    [searchParams],
  );

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!token) {
      setError("Reset link is missing or invalid.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.completePasswordReset(token, newPassword);
      setSuccessMessage("Password updated. You can sign in now.");
      setNewPassword("");
      setConfirmPassword("");
      window.setTimeout(() => navigate("/login"), 1200);
    } catch (caught) {
      const apiError = caught as { message?: string };
      setError(
        apiError.message ||
          "Unable to reset password. The link may be expired or already used.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthSplitLayout variant="forgot-password">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Link
          to="/login"
          className="group mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 py-1 pl-1 pr-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
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

        <PageHeader
          title="Choose a new password"
          description="Use the link from your email. If an admin already completed this reset, the link will no longer work."
        />

        {!token ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This page needs a valid reset token from your email link.
          </div>
        ) : null}

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

        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <FieldLabel htmlFor="newPassword" required>
              New password
            </FieldLabel>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className={inputClassName}
              placeholder="At least 6 characters"
              required
              disabled={isSubmitting || !token}
              minLength={6}
            />
          </div>
          <div>
            <FieldLabel htmlFor="confirmPassword" required>
              Confirm password
            </FieldLabel>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClassName}
              placeholder="Re-enter password"
              required
              disabled={isSubmitting || !token}
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !token}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Saving..." : "Update password"}
          </button>
        </form>
      </div>
    </AuthSplitLayout>
  );
}
