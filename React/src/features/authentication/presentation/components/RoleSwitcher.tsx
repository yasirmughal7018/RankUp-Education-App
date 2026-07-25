import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  dashboardPathForRole,
  getRoleLabel,
  type UserRole,
} from "@/core/api/types";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";

/** Switch active role when the account has multiple roles. */
export function RoleSwitcher() {
  const { user, switchRole, isSubmitting } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  if (!user || !user.roles || user.roles.length < 2) {
    return null;
  }

  async function handleChange(nextRole: string) {
    if (!user || nextRole === user.role) {
      return;
    }

    setError(null);
    try {
      const updated = await switchRole(nextRole as UserRole);
      navigate(dashboardPathForRole(updated.role), { replace: true });
    } catch (caught) {
      const message =
        caught && typeof caught === "object" && "message" in caught
          ? String((caught as { message: string }).message)
          : "Unable to switch role.";
      setError(message);
    }
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <label className="flex w-full flex-col gap-1 text-xs text-slate-600">
        <span className="font-semibold text-slate-500">Acting as</span>
        <select
          value={user.role}
          disabled={isSubmitting}
          aria-label="Switch active role"
          onChange={(event) => void handleChange(event.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {user.roles.map((role) => (
            <option key={role} value={role}>
              {getRoleLabel(role)}
            </option>
          ))}
        </select>
      </label>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
