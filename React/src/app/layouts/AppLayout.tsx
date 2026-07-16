import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { environment } from "@/app/environment";
import { isAdminRole } from "@/core/api/types";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import { UserMenu } from "@/features/authentication/presentation/components/UserMenu";
import { NotificationsBell } from "@/features/notifications/presentation/components/NotificationsBell";
import { canManageQuestions } from "@/features/questions/domain/questionTypes";
import { canManageQuizzes } from "@/features/quizzes/domain/quizTypes";
import { canViewReports } from "@/features/reports/domain/reportTypes";
import { canTakeStudentQuizzes } from "@/features/student/domain/studentQuizTypes";

type NavItem = {
  to: string;
  label: string;
  end?: boolean;
};

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "relative whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-brand-50 text-brand-700"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  ].join(" ");

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-brand-50 text-brand-700"
      : "text-slate-700 hover:bg-slate-100",
  ].join(" ");

const AUTH_PAGES_WITHOUT_MENU = new Set(["/login", "/request-access"]);

export function AppLayout() {
  const { isAuthenticated, user, isBootstrapping } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const hideMenuBar = AUTH_PAGES_WITHOUT_MENU.has(location.pathname);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const navItems: NavItem[] = [];
  if (isAuthenticated) {
    navItems.push({ to: "/dashboard", label: "Dashboard" });
    if (user && isAdminRole(user.role)) {
      navItems.push({ to: "/admin", label: "Admin" });
    }
    if (user && canManageQuestions(user.role)) {
      navItems.push({ to: "/questions", label: "Questions" });
    }
    if (user && canManageQuizzes(user.role)) {
      navItems.push(
        { to: "/quizzes", label: "Quizzes", end: true },
        { to: "/quizzes/assignments", label: "Assignments" },
        { to: "/quizzes/reviews/pending", label: "Reviews" },
      );
    }
    if (user && canViewReports(user.role)) {
      navItems.push({ to: "/reports", label: "Reports" });
    }
    if (user?.role === "Parent") {
      navItems.push({ to: "/parent/children", label: "Children" });
    }
    if (user && canTakeStudentQuizzes(user.role)) {
      navItems.push({ to: "/student/quizzes", label: "My quizzes" });
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {hideMenuBar ? null : (
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
            <Link
              to="/"
              className="flex min-w-0 shrink-0 items-center gap-3 rounded-xl outline-none ring-brand-500 focus-visible:ring-2"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-xs font-bold tracking-wide text-white shadow-sm shadow-brand-600/25">
                RU
              </span>
              <p className="min-w-0 truncate text-sm font-semibold text-slate-900">
                {environment.appName}
              </p>
            </Link>

            <nav
              className="ml-2 hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto lg:flex"
              aria-label="Main"
            >
              <NavLink to="/" end className={navLinkClass}>
                Home
              </NavLink>
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={navLinkClass}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  {user && isAdminRole(user.role) ? (
                    <div className="hidden sm:block">
                      <NotificationsBell />
                    </div>
                  ) : null}
                  <div className="hidden border-l border-slate-200 pl-3 md:block">
                    <UserMenu />
                  </div>
                  <div className="md:hidden">
                    <UserMenu compact />
                  </div>
                </>
              ) : !isBootstrapping ? (
                <NavLink
                  to="/login"
                  className="hidden rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 sm:inline-flex"
                >
                  Login
                </NavLink>
              ) : null}

              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-50 lg:hidden"
                aria-expanded={menuOpen}
                aria-controls="mobile-nav"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      d="M6 6l12 12M18 6L6 18"
                    />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      d="M4 7h16M4 12h16M4 17h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {menuOpen ? (
            <div
              id="mobile-nav"
              className="border-t border-slate-200 bg-white lg:hidden"
            >
              <div className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:px-6">
                <nav className="flex flex-col gap-0.5" aria-label="Mobile">
                  <NavLink to="/" end className={mobileNavLinkClass}>
                    Home
                  </NavLink>
                  {navItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={mobileNavLinkClass}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                  {!isAuthenticated && !isBootstrapping ? (
                    <NavLink to="/login" className={mobileNavLinkClass}>
                      Login
                    </NavLink>
                  ) : null}
                </nav>

                {isAuthenticated && user && isAdminRole(user.role) ? (
                  <div className="border-t border-slate-100 pt-4 sm:hidden">
                    <NotificationsBell />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </header>
      )}

      <main className="flex-1">
        <Outlet />
      </main>

      {hideMenuBar ? null : (
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-4 text-center text-sm text-slate-500 sm:px-6">
            © {new Date().getFullYear()} RankUp Education. All rights reserved.
          </div>
        </footer>
      )}
    </div>
  );
}
