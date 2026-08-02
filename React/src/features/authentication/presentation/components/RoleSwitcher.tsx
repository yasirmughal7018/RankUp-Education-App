import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  dashboardPathForRole,
  getRoleLabel,
  type UserRole,
} from "@/core/api/types";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import { cn } from "@/lib/utils";

/** Switch active role when the account has multiple roles (segmented toggle). */
export function RoleSwitcher() {
  const { user, switchRole, isSubmitting } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  if (!user || !user.roles || user.roles.length < 2) {
    return null;
  }

  async function handleChange(nextRole: UserRole) {
    if (!user || nextRole === user.role) {
      return;
    }

    setError(null);
    try {
      const updated = await switchRole(nextRole);
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
    <div className="flex w-full flex-col gap-1.5">
      <p className="text-xs font-semibold text-slate-500">Acting as</p>
      <div
        role="group"
        aria-label="Switch active role"
        className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1"
      >
        {user.roles.map((role) => {
          const isSelected = role === user.role;
          return (
            <button
              key={role}
              type="button"
              disabled={isSubmitting}
              aria-pressed={isSelected}
              onClick={() => void handleChange(role)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                isSelected
                  ? "bg-white text-brand-700 shadow-sm ring-1 ring-slate-200/80"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              {getRoleLabel(role)}
            </button>
          );
        })}
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
