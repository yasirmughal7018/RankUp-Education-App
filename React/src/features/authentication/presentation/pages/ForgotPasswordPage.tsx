import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import * as authApi from "@/features/authentication/data/authApi";

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
    <div className="mx-auto flex max-w-6xl justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
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
            <label
              htmlFor="username"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2"
              placeholder="Enter your username"
              required
              disabled={isSubmitting}
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
          <Link
            to="/login"
            className="font-medium text-brand-700 hover:text-brand-800"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
