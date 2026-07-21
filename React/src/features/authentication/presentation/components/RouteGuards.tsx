import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";

function AuthLoadingScreen() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm text-slate-600 shadow-sm">
        Checking your session...
      </div>
    </div>
  );
}

/** Requires authentication; redirects guests to login. */
export function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

/** Login/register pages only; redirects authenticated users away. */
export function GuestRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();
  const redirectPath =
    (location.state as { from?: string } | null)?.from ?? "/dashboard";

  if (isBootstrapping) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
}
