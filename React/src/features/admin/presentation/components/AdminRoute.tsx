import { Outlet } from "react-router-dom";
import { isAdminRole } from "@/core/api/types";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";

function ForbiddenScreen() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Access denied</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Only PortalAdmin, SchoolAdmin, and CampusAdmin accounts can access
          administration pages.
        </p>
      </div>
    </div>
  );
}

/** Restricts routes to PortalAdmin, SchoolAdmin, and CampusAdmin. */
export function AdminRoute() {
  const { user } = useAuth();

  if (!user || !isAdminRole(user.role)) {
    return <ForbiddenScreen />;
  }

  return <Outlet />;
}
