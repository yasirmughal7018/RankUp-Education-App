import { useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import * as authApi from "@/features/authentication/data/authApi";

interface ChangePasswordModalProps {
  onSuccess: (user: Awaited<ReturnType<typeof authApi.changePassword>>) => void;
}

const inputClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2";

export function ChangePasswordModal({ onSuccess }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await authApi.changePassword({
        currentPassword,
        newPassword,
      });
      onSuccess(user);
    } catch (caught) {
      const apiError = caught as ApiError;
      setError(apiError.message || "Unable to change password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 px-4 py-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2
          id="change-password-title"
          className="text-xl font-semibold text-slate-900"
        >
          Change your password
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          You must set a new password before continuing. This is required after
          an admin creates your account.
        </p>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="currentPassword"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Current password
            </label>
            <input
              id="currentPassword"
              type="password"
              required
              autoFocus
              disabled={isSubmitting}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              required
              minLength={6}
              disabled={isSubmitting}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={6}
              disabled={isSubmitting}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClassName}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
