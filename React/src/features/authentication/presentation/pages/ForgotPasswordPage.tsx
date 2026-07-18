import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { FieldLabel } from "@/core/components/FieldLabel";
import { PageHeader } from "@/core/components/PageHeader";
import * as authApi from "@/features/authentication/data/authApi";
import { AuthSplitLayout } from "@/features/authentication/presentation/components/AuthSplitLayout";

const inputClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2";

export function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await authApi.requestPasswordReset(username.trim());
      setSuccessMessage(
        "If the account exists, the school admin has been notified.",
      );
      setUsername("");
    } catch (caught) {
      const apiError = caught as { message?: string };
      setError(apiError.message || "Unable to submit password reset request.");
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
          title="Forgot password"
          description="Request a password reset. Your school admin will be notified to help restore access."
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
            <FieldLabel htmlFor="username" required>
              CNIC or mobile number
            </FieldLabel>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className={inputClassName}
              placeholder="Enter CNIC or mobile number"
              required
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Submitting..." : "Request reset"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Need an account?{" "}
          <Link
            to="/request-access"
            className="font-medium text-brand-700 hover:text-brand-800"
          >
            Request access
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
