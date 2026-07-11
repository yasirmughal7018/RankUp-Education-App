import { Link, NavLink, Outlet } from "react-router-dom";
import { environment } from "@/app/environment";
import { getRoleLabel, isAdminRole } from "@/core/api/types";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import { RoleSwitcher } from "@/features/authentication/presentation/components/RoleSwitcher";
import { NotificationsBell } from "@/features/notifications/presentation/components/NotificationsBell";
import { canManageQuestions } from "@/features/questions/domain/questionTypes";
import { canManageQuizzes } from "@/features/quizzes/domain/quizTypes";
import { canViewReports } from "@/features/reports/domain/reportTypes";
import { canTakeStudentQuizzes } from "@/features/student/domain/studentQuizTypes";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-brand-600 text-white"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  ].join(" ");

export function AppLayout() {
  const { isAuthenticated, user, logout, isBootstrapping } = useAuth();

  async function handleLogout() {
    await logout();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
              RU
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {environment.appName}
              </p>
              <p className="text-xs text-slate-500">Web Administration</p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-2">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>

            {isAuthenticated ? (
              <>
                <NavLink to="/dashboard" className={navLinkClass}>
                  Dashboard
                </NavLink>
                {user && isAdminRole(user.role) ? (
                  <NavLink to="/admin" className={navLinkClass}>
                    Admin
                  </NavLink>
                ) : null}
                {user && canManageQuestions(user.role) ? (
                  <NavLink to="/questions" className={navLinkClass}>
                    Questions
                  </NavLink>
                ) : null}
                {user && canManageQuizzes(user.role) ? (
                  <>
                    <NavLink to="/quizzes" className={navLinkClass}>
                      Quizzes
                    </NavLink>
                    <NavLink to="/quizzes/assignments" className={navLinkClass}>
                      Assignments
                    </NavLink>
                    <NavLink to="/quizzes/reviews/pending" className={navLinkClass}>
                      Reviews
                    </NavLink>
                  </>
                ) : null}
                {user && canViewReports(user.role) ? (
                  <NavLink to="/reports" className={navLinkClass}>
                    Reports
                  </NavLink>
                ) : null}
                {user?.role === "Parent" ? (
                  <NavLink to="/parent/children" className={navLinkClass}>
                    Children
                  </NavLink>
                ) : null}
                {user && canTakeStudentQuizzes(user.role) ? (
                  <NavLink to="/student/quizzes" className={navLinkClass}>
                    My quizzes
                  </NavLink>
                ) : null}
                <div className="flex items-center gap-2">
                  <RoleSwitcher />
                  {user && isAdminRole(user.role) ? <NotificationsBell /> : null}
                  <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 sm:inline">
                    {user?.fullName || user?.username}
                    {user ? ` · ${getRoleLabel(user.role)}` : null}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : !isBootstrapping ? (
              <NavLink to="/login" className={navLinkClass}>
                Login
              </NavLink>
            ) : null}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 text-center text-sm text-slate-500 sm:px-6">
          © {new Date().getFullYear()} RankUp Education. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
