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

  const lockedRole = user.pendingSchoolChange?.lockedRole ?? null;
  const orderedRoles = [...user.roles].sort((a, b) => {
    const order: UserRole[] = ["Teacher", "Coordinator", "Parent"];
    const rank = (role: UserRole) => {
      const index = order.indexOf(role);
      return index === -1 ? 99 : index;
    };
    return rank(a) - rank(b);
  });

  async function handleChange(nextRole: UserRole) {
    if (!user || nextRole === user.role) {
      return;
    }
    if (lockedRole && nextRole === lockedRole) {
      setError(
        `${getRoleLabel(nextRole)} is locked pending school/campus change approval.`,
      );
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
        className={cn(
          "grid gap-1 rounded-lg bg-slate-100 p-1",
          orderedRoles.length >= 3 ? "grid-cols-3" : "grid-cols-2",
        )}
      >
        {orderedRoles.map((role) => {
          const isSelected = role === user.role;
          const isLocked = lockedRole === role;
          return (
            <button
              key={role}
              type="button"
              disabled={isSubmitting || isLocked}
              aria-pressed={isSelected}
              title={
                isLocked
                  ? "Locked pending school/campus change approval"
                  : undefined
              }
              onClick={() => void handleChange(role)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                isSelected
                  ? "bg-white text-brand-700 shadow-sm ring-1 ring-slate-200/80"
                  : "text-slate-600 hover:text-slate-900",
                isLocked && "bg-amber-50 text-amber-800",
              )}
            >
              {getRoleLabel(role)}
              {isLocked ? " · Locked" : ""}
            </button>
          );
        })}
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
