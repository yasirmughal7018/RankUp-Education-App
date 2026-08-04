import { Link, useLocation } from "react-router-dom";
import { AuthSplitLayout } from "@/features/authentication/presentation/components/AuthSplitLayout";

const DEFAULT_MESSAGE =
  "Your account is locked because you requested a school or campus change. An admin for the destination school or campus must approve (or reject) the change before you can sign in again.";

export function AccountLockedPage() {
  const location = useLocation();
  const state = location.state as { message?: string } | null;
  const message = state?.message?.trim() || DEFAULT_MESSAGE;

  return (
    <AuthSplitLayout variant="account-locked">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Account locked
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Why you are locked
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">{message}</p>
          <p className="mt-4 text-sm text-slate-600">
            After approval or rejection, your account unlocks and you can sign in
            again with the same CNIC or mobile number.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </AuthSplitLayout>
  );
}
