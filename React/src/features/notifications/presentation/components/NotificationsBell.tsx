import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/core/api/queryKeys";
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
]);

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () => notificationsApi.listNotifications(20),
    refetchInterval: 60_000,
  });

  const items = data?.items ?? [];
  const adminItems = items.filter((item) =>
    ADMIN_NOTIFICATION_CATEGORIES.has(item.category),
  );
  const unreadCount = adminItems.filter((item) => !item.isRead).length;
  const recentItems = adminItems.slice(0, 8);

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

  function hrefForCategory(category: string) {
    return category === "SchoolChangeRequest"
      ? "/admin/directory/school-changes"
      : "/admin/registrations";
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label="Admin notifications"
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
            <p className="text-sm font-semibold text-slate-900">
              Admin requests
            </p>
            <p className="text-xs text-slate-500">
              Registrations and school/campus changes
            </p>
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
                No admin notifications.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentItems.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={hrefForCategory(item.category)}
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
                ))}
              </ul>
            )}
          </div>

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
          </div>
        </div>
      ) : null}
    </div>
  );
}
