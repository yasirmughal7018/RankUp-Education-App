import { useMemo } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { isAdminRole } from "@/core/api/types";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import { UserMenu } from "@/features/authentication/presentation/components/UserMenu";
import { NotificationsBell } from "@/features/notifications/presentation/components/NotificationsBell";
import { canManageQuestions } from "@/features/questions/domain/questionTypes";
import { canManageQuizzes } from "@/features/quizzes/domain/quizTypes";
import { canViewReports } from "@/features/reports/domain/reportTypes";
import { canTakeStudentQuizzes } from "@/features/student/domain/studentQuizTypes";
import { AppShell } from "@/components/layout/app-shell";
import type { SidebarNavItem } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";

const AUTH_PAGES_WITHOUT_MENU = new Set([
  "/login",
  "/account-locked",
  "/request-access",
  "/forgot-password",
]);

/** Shell layout: AppShell chrome + outlet for all routes. */
export function AppLayout() {
  const { isAuthenticated, user, isBootstrapping } = useAuth();
  const location = useLocation();
  const hideChrome = AUTH_PAGES_WITHOUT_MENU.has(location.pathname);

  const navItems = useMemo(() => {
    const items: SidebarNavItem[] = [{ to: "/", label: "Home", end: true }];
    if (!isAuthenticated) {
      return items;
    }

    items.push({ to: "/dashboard", label: "Dashboard" });
    if (user && isAdminRole(user.role)) {
      items.push(
        { to: "/admin", label: "Admin" },
        { to: "/admin/directory", label: "Directory" },
      );
    }
    if (user && canManageQuestions(user.role)) {
      items.push({ to: "/questions", label: "Questions" });
    }
    if (user && canManageQuizzes(user.role)) {
      items.push(
        { to: "/quizzes", label: "Quizzes", end: true },
        { to: "/quizzes/assignments", label: "Assignments" },
        { to: "/quizzes/reviews/pending", label: "Reviews" },
      );
    }
    if (user && canViewReports(user.role)) {
      items.push({ to: "/reports", label: "Reports" });
    }
    if (user?.role === "Parent") {
      items.push(
        { to: "/parent/children", label: "Children" },
        { to: "/parent/quiz-dashboard", label: "Quiz dashboard" },
      );
    }
    if (user && canTakeStudentQuizzes(user.role)) {
      items.push(
        { to: "/student/dashboard", label: "Learning" },
        { to: "/student/quizzes", label: "My quizzes" },
      );
    }
    return items;
  }, [isAuthenticated, user]);

  const mobileNavItems = useMemo(() => {
    if (!isAuthenticated || !user) {
      return [
        { to: "/", label: "Home", end: true },
        { to: "/request-access", label: "Join" },
      ];
    }
    const items: SidebarNavItem[] = [{ to: "/dashboard", label: "Home" }];
    if (isAdminRole(user.role)) {
      items.push({ to: "/admin/directory", label: "Directory" });
    }
    if (canManageQuestions(user.role) && !isAdminRole(user.role)) {
      items.push({ to: "/questions", label: "Questions" });
    }
    if (canManageQuizzes(user.role)) {
      items.push({ to: "/quizzes", label: "Quizzes", end: true });
    }
    if (user.role === "Parent") {
      items.push(
        { to: "/parent/children", label: "Children" },
        { to: "/parent/quiz-dashboard", label: "Quizzes" },
      );
    }
    if (canTakeStudentQuizzes(user.role)) {
      items.push(
        { to: "/student/dashboard", label: "Learn" },
        { to: "/student/quizzes", label: "Quizzes" },
      );
    }
    return items.slice(0, 5);
  }, [isAuthenticated, user]);

  const trailing = (
    <div className="flex items-center gap-2">
      {isAuthenticated ? (
        <>
          {user && isAdminRole(user.role) ? (
            <div className="hidden sm:block">
              <NotificationsBell />
            </div>
          ) : null}
          <UserMenu />
        </>
      ) : !isBootstrapping ? (
        <Button asChild variant="outline" size="sm" className="rounded-xl">
          <NavLink to="/login">Sign in</NavLink>
        </Button>
      ) : null}
    </div>
  );

  return (
    <AppShell
      hideChrome={hideChrome}
      navItems={navItems}
      mobileNavItems={mobileNavItems}
      topbarTrailing={trailing}
      role={user?.role}
    >
      <Outlet />
    </AppShell>
  );
}
