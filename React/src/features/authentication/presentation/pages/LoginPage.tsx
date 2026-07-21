import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { ApiError } from "@/core/api/types";
import { FieldLabel } from "@/core/components/FieldLabel";
import { PageHeader } from "@/core/components/PageHeader";
import * as authApi from "@/features/authentication/data/authApi";
import type { LoginStatus } from "@/features/authentication/data/authApi";
import { AuthSplitLayout } from "@/features/authentication/presentation/components/AuthSplitLayout";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";

type LoginStep = "identifier" | "setPassword" | "password";

const inputClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2";

/** Multi-step login: status check, password setup, and sign-in. */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setInitialPassword, isSubmitting, error, clearError } =
    useAuth();

  const [step, setStep] = useState<LoginStep>("identifier");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const redirectPath =
    (location.state as { from?: string } | null)?.from ?? "/dashboard";

  const busy = isSubmitting || checkingStatus;
  const displayError = localError ?? error;

  function resetMessages() {
    clearError();
    setLocalError(null);
    setInfoMessage(null);
    setSuccessMessage(null);
  }

  function goBackToIdentifier() {
    resetMessages();
    setPassword("");
    setConfirmPassword("");
    setStep("identifier");
  }

  async function handleIdentifierContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setLocalError("CNIC or mobile number is required.");
      return;
    }

    setCheckingStatus(true);
    try {
      const status = await authApi.getLoginStatus(trimmedUsername);
      applyLoginStatus(status.status, status.message);
    } catch (caught) {
      const apiError = caught as ApiError;
      setLocalError(apiError.message || "Unable to check account.");
    } finally {
      setCheckingStatus(false);
    }
  }

  function applyLoginStatus(status: LoginStatus, message: string) {
    setPassword("");
    setConfirmPassword("");

    if (status === "LockedPendingSchoolChange") {
      navigate("/account-locked", {
        replace: true,
        state: { message },
      });
      return;
    }

    if (status === "PendingApproval" || status === "Rejected") {
      setInfoMessage(message);
      setStep("identifier");
      return;
    }

    if (status === "NeedsPasswordSetup") {
      setInfoMessage(message);
      setStep("setPassword");
      return;
    }

    setStep("password");
  }

  async function handleSetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("Password and confirmation do not match.");
      return;
    }

    try {
      await setInitialPassword(username.trim(), password);
      setPassword("");
      setConfirmPassword("");
      setStep("password");
      setSuccessMessage(
        "Password set successfully. Sign in with your new password.",
      );
    } catch {
      // AuthProvider sets error.
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (!password.trim()) {
      setLocalError("Password is required.");
      return;
    }

    try {
      await login(username.trim(), password);
      navigate(redirectPath, { replace: true });
    } catch {
      // AuthProvider sets error.
    }
  }

  const title =
    step === "setPassword"
      ? "Set your password"
      : step === "password"
        ? "Enter password"
        : "Sign in";

  const description =
    step === "setPassword"
      ? "Your account is approved. Create a password, then sign in with it."
      : step === "password"
        ? `Sign in as ${username.trim()}`
        : "Enter your CNIC or mobile number to continue.";

  return (
    <AuthSplitLayout variant="login">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <PageHeader title={title} description={description} />

        {successMessage ? (
          <div
            role="status"
            className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          >
            {successMessage}
          </div>
        ) : null}

        {infoMessage ? (
          <div
            role="status"
            className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {infoMessage}
          </div>
        ) : null}

        {displayError ? (
          <div
            role="alert"
            className={
              displayError.toLowerCase().includes("not approved")
                ? "mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                : "mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            }
          >
            {displayError}
          </div>
        ) : null}

        {step === "identifier" ? (
          <form className="space-y-4" onSubmit={handleIdentifierContinue}>
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
                disabled={busy}
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-brand-700 hover:text-brand-800"
              >
                Forgot password?
              </Link>
              <Link
                to="/request-access"
                className="font-medium text-brand-700 hover:text-brand-800"
              >
                Request account access
              </Link>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {checkingStatus ? "Checking..." : "Continue"}
            </button>
          </form>
        ) : null}

        {step === "setPassword" ? (
          <form className="space-y-4" onSubmit={handleSetPassword}>
            <div>
              <FieldLabel htmlFor="newPassword" required>
                New password
              </FieldLabel>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClassName}
                placeholder="At least 6 characters"
                required
                minLength={6}
                disabled={busy}
                autoFocus
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
                minLength={6}
                disabled={busy}
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Saving password..." : "Set password"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={goBackToIdentifier}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
            >
              Back
            </button>
          </form>
        ) : null}

        {step === "password" ? (
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <FieldLabel htmlFor="password" required>
                Password
              </FieldLabel>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClassName}
                placeholder="Your password"
                required
                disabled={busy}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={goBackToIdentifier}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
            >
              Use a different CNIC / mobile
            </button>
          </form>
        ) : null}

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link to="/" className="font-medium text-brand-700 hover:text-brand-800">
            Back to home
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
