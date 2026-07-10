import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setInitialPassword, isSubmitting, error, clearError } =
    useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstLogin, setFirstLogin] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const redirectPath =
    (location.state as { from?: string } | null)?.from ?? "/dashboard";

  const displayError = localError ?? error;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    setLocalError(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setLocalError("CNIC or mobile number is required.");
      return;
    }

    try {
      if (firstLogin) {
        if (password.length < 6) {
          setLocalError("Password must be at least 6 characters.");
          return;
        }
        if (password !== confirmPassword) {
          setLocalError("Password and confirmation do not match.");
          return;
        }
        await setInitialPassword(trimmedUsername, password);
      } else {
        await login(trimmedUsername, password);
      }
      navigate(redirectPath, { replace: true });
    } catch {
      // Error state is handled by AuthProvider.
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <PageHeader
          title="Sign in"
          description={
            firstLogin
              ? "After admin approval, set your own password here to sign in."
              : "Sign in with your CNIC or mobile number and password."
          }
        />

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

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="username"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              CNIC or mobile number
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2"
              placeholder="Enter CNIC or mobile number"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              {firstLogin ? "New password" : "Password"}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={firstLogin ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2"
              placeholder={
                firstLogin
                  ? "At least 6 characters"
                  : "Your password"
              }
              required={!firstLogin}
              minLength={firstLogin ? 6 : undefined}
              disabled={isSubmitting}
            />
          </div>

          {firstLogin ? (
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2"
                placeholder="Re-enter password"
                required
                minLength={6}
                disabled={isSubmitting}
              />
            </div>
          ) : null}

          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-slate-300"
              checked={firstLogin}
              disabled={isSubmitting}
              onChange={(event) => {
                setFirstLogin(event.target.checked);
                setPassword("");
                setConfirmPassword("");
                setLocalError(null);
                clearError();
              }}
            />
            <span>
              First login after approval — I need to set my password
            </span>
          </label>

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
            disabled={isSubmitting}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting
              ? firstLogin
                ? "Setting password..."
                : "Signing in..."
              : firstLogin
                ? "Set password and sign in"
                : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link to="/" className="font-medium text-brand-700 hover:text-brand-800">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
