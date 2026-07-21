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
      <label className="flex w-full flex-col gap-1.5 text-xs text-slate-600 sm:flex-row sm:items-center">
        <span className="shrink-0 font-medium text-slate-500">Acting as</span>
        <select
          value={user.role}
          disabled={isSubmitting}
          onChange={(event) => void handleChange(event.target.value)}
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:min-w-[9rem]"
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
