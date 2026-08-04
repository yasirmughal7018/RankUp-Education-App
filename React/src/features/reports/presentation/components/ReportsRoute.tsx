import { Outlet } from "react-router-dom";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import { canViewReports } from "@/features/reports/domain/reportTypes";

function ForbiddenScreen() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Access denied</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Only PortalAdmin, SchoolAdmin, and Teacher accounts can view reports.
        </p>
      </div>
    </div>
  );
}

/** Restricts routes to report viewer roles. */
export function ReportsRoute() {
  const { user } = useAuth();

  if (!user || !canViewReports(user.role)) {
    return <ForbiddenScreen />;
  }

  return <Outlet />;
}
