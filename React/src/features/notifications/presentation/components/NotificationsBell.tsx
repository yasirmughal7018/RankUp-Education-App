import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/core/api/queryKeys";
import { isAdminRole, type UserRole } from "@/core/api/types";
import * as authApi from "@/features/authentication/data/authApi";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import * as notificationsApi from "@/features/notifications/data/notificationsApi";

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const ADMIN_NOTIFICATION_CATEGORIES = new Set([
  "RegistrationRequest",
  "SchoolChangeRequest",
  "RoleRequest",
  "PasswordResetRequest",
  "QuestionEditRequest",
  "QuizEditRequest",
]);

const QUIZ_NOTIFICATION_CATEGORIES = new Set([
  "QuizAssigned",
  "QuizSubmitted",
  "QuizAutoSubmitted",
  "QuizReviewed",
  "QuizPendingApproval",
  "QuizApproved",
  "QuizRejected",
]);

const PASSWORD_RESET_TITLE_PREFIX = "Password reset: ";

function usernameFromPasswordResetTitle(title: string): string | null {
  if (!title.startsWith(PASSWORD_RESET_TITLE_PREFIX)) {
    return null;
  }

  const username = title.slice(PASSWORD_RESET_TITLE_PREFIX.length).trim();
  return username.length > 0 ? username : null;
}

function isVisibleCategory(category: string, role: UserRole | undefined): boolean {
  const isQuiz = QUIZ_NOTIFICATION_CATEGORIES.has(category);
  const isAdminCategory = ADMIN_NOTIFICATION_CATEGORIES.has(category);

  if (!role) {
    return isQuiz || isAdminCategory;
  }

  if (isAdminRole(role)) {
    return isQuiz || isAdminCategory;
  }

  // Parents also receive student password-reset help requests.
  if (role === "Parent" && category === "PasswordResetRequest") {
    return true;
  }

  if (category === "QuestionEditRequest") {
    return true;
  }

  if (category === "QuizEditRequest") {
    return true;
  }

  // Teachers, Parents, Students: quiz alerts (API already scopes by recipient).
  return isQuiz;
}

function hrefForCategory(
  category: string,
  role: UserRole | undefined,
  body?: string,
): string {
  if (category === "SchoolChangeRequest") {
    return "/admin/directory/school-changes";
  }

  if (category === "RoleRequest") {
    return "/admin/directory/role-requests";
  }

  if (category === "PasswordResetRequest") {
    return role === "Parent" ? "/parent/children" : "/admin/directory";
  }

  if (category === "QuestionEditRequest") {
    if (role === "PortalAdmin") {
      return "/questions?view=edit-requests";
    }

    const questionMatch = body?.match(/question #(\d+)/i);
    if (questionMatch) {
      return `/questions/${questionMatch[1]}`;
    }

    return "/questions";
  }

  if (category === "QuizEditRequest") {
    if (
      role === "PortalAdmin" ||
      role === "SchoolAdmin" ||
      role === "CampusAdmin"
    ) {
      return "/quizzes?view=edit-requests";
    }

    const quizMatch = body?.match(/quiz #(\d+)/i);
    if (quizMatch) {
      return `/quizzes/${quizMatch[1]}`;
    }

    return "/quizzes";
  }

  if (category === "QuizAssigned" || category === "QuizReviewed") {
    return role === "Student" ? "/student/quizzes" : "/quizzes";
  }

  if (category === "QuizApproved" || category === "QuizRejected") {
    return "/quizzes";
  }

  if (category === "QuizPendingApproval") {
    return "/quizzes";
  }

  if (category === "QuizSubmitted" || category === "QuizAutoSubmitted") {
    return "/quizzes/reviews/pending";
  }

  return "/admin/registrations";
}

function headerCopy(role: UserRole | undefined): { title: string; subtitle: string } {
  if (role && isAdminRole(role)) {
    return {
      title: "Notifications",
      subtitle: "Admin requests and quiz alerts",
    };
  }

  if (role === "Parent") {
    return {
      title: "Notifications",
      subtitle: "Child quizzes and password help requests",
    };
  }

  if (role === "Student") {
    return {
      title: "Notifications",
      subtitle: "Quiz assignments and results",
    };
  }

  return {
    title: "Notifications",
    subtitle: "Quiz submissions and reviews",
  };
}

/** In-app notification dropdown for all authenticated roles. */
export function NotificationsBell() {
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = role != null && isAdminRole(role);
  const canClearPasswordReset = isAdmin || role === "Parent";
  const [open, setOpen] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [clearingUsername, setClearingUsername] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { title, subtitle } = headerCopy(role);

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () => notificationsApi.listNotifications(20),
    refetchInterval: 60_000,
  });

  const items = data?.items ?? [];
  const visibleItems = items.filter((item) =>
    isVisibleCategory(item.category, role),
  );
  const unreadCount = visibleItems.filter((item) => !item.isRead).length;
  const recentItems = visibleItems.slice(0, 8);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  async function markCategoryRead(category: string) {
    try {
      await notificationsApi.markNotificationCategoryRead(category);
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
    } catch {
      // Page still opens even if mark-read fails.
    }
  }

  async function handleClearPassword(notificationId: number, username: string) {
    const confirmed = window.confirm(
      `Clear the password for "${username}"?\n\nThey will set a new password on the login screen.\nIf someone already completed this request, this action will fail.`,
    );
    if (!confirmed) {
      return;
    }

    setClearError(null);
    setClearingUsername(username);
    try {
      await authApi.clearPasswordForReset(username);
      const relatedIds = visibleItems
        .filter(
          (item) =>
            item.category === "PasswordResetRequest" &&
            !item.isRead &&
            (item.id === notificationId ||
              usernameFromPasswordResetTitle(item.title) === username),
        )
        .map((item) => item.id);
      await Promise.all(
        relatedIds.map((id) => notificationsApi.markNotificationRead(id)),
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
      setOpen(false);
    } catch (caught) {
      const apiError = caught as { message?: string };
      setClearError(apiError.message || "Unable to clear password.");
    } finally {
      setClearingUsername(null);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9"
          />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                Loading...
              </p>
            ) : isError ? (
              <p className="px-4 py-6 text-center text-sm text-red-600">
                Unable to load notifications.
              </p>
            ) : recentItems.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                No notifications.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentItems.map((item) => {
                  const resetUsername =
                    canClearPasswordReset &&
                    item.category === "PasswordResetRequest"
                      ? usernameFromPasswordResetTitle(item.title)
                      : null;

                  if (resetUsername) {
                    return (
                      <li key={item.id} className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-900">
                          {item.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                          {item.body}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {formatCreatedAt(item.createdAt)}
                        </p>
                        <button
                          type="button"
                          disabled={clearingUsername === resetUsername}
                          onClick={() =>
                            void handleClearPassword(item.id, resetUsername)
                          }
                          className="mt-2 rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
                        >
                          {clearingUsername === resetUsername
                            ? "Clearing..."
                            : "Clear password"}
                        </button>
                      </li>
                    );
                  }

                  return (
                    <li key={item.id}>
                      <Link
                        to={hrefForCategory(item.category, role, item.body)}
                        onClick={() => {
                          setOpen(false);
                          void markCategoryRead(item.category);
                        }}
                        className={[
                          "block px-4 py-3 transition hover:bg-slate-50",
                          item.isRead ? "bg-white" : "bg-brand-50/40",
                        ].join(" ")}
                      >
                        <p className="text-sm font-medium text-slate-900">
                          {item.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                          {item.body}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {formatCreatedAt(item.createdAt)}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {clearError ? (
            <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
              {clearError}
            </p>
          ) : null}

          {isAdmin ? (
            <div className="flex flex-col gap-1 border-t border-slate-100 px-4 py-2">
              <Link
                to="/admin/registrations"
                onClick={() => {
                  setOpen(false);
                  void markCategoryRead("RegistrationRequest");
                }}
                className="text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                Registration approvals
              </Link>
              <Link
                to="/admin/directory/school-changes"
                onClick={() => {
                  setOpen(false);
                  void markCategoryRead("SchoolChangeRequest");
                }}
                className="text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                School / campus changes
              </Link>
              {role === "PortalAdmin" ? (
                <Link
                  to="/questions?view=edit-requests"
                  onClick={() => {
                    setOpen(false);
                    void markCategoryRead("QuestionEditRequest");
                  }}
                  className="text-xs font-medium text-brand-700 hover:text-brand-800"
                >
                  Question edit requests
                </Link>
              ) : null}
            </div>
          ) : role === "Student" ? (
            <div className="border-t border-slate-100 px-4 py-2">
              <Link
                to="/student/quizzes"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                My quizzes
              </Link>
            </div>
          ) : (
            <div className="border-t border-slate-100 px-4 py-2">
              <Link
                to="/quizzes/reviews/pending"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                Pending reviews
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
