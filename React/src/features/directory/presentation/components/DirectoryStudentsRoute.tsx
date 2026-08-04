import { Outlet } from "react-router-dom";
import { isAdminRole } from "@/core/api/types";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";

function ForbiddenScreen() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Access denied</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Only Parent, Teacher, School Admin, Campus Admin, and Portal Admin
          accounts can view student profiles.
        </p>
      </div>
    </div>
  );
}

/** Allows School/Campus/Portal admins and Teachers to view the student directory. */
export function DirectoryStudentsRoute() {
  const { user } = useAuth();
  const allowed =
    user != null && (isAdminRole(user.role) || user.role === "Teacher");

  if (!allowed) {
    return <ForbiddenScreen />;
  }

  return <Outlet />;
}
