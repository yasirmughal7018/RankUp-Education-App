import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getRoleLabel } from "@/core/api/types";
import { resolvePublicUrl } from "@/features/authentication/domain/avatarUrl";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";

function userInitials(name?: string | null, username?: string | null) {
  const source = (name || username || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

interface UserMenuProps {
  compact?: boolean;
}

export function UserMenu({ compact = false }: UserMenuProps) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) {
    return null;
  }

  async function handleLogout() {
    setOpen(false);
    await logout();
  }

  const initials = userInitials(user.fullName, user.username);
  const displayName = user.fullName || user.username;
  const avatarUrl = resolvePublicUrl(user.avatarUrl);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={[
          "flex items-center gap-2 rounded-xl outline-none transition",
          "hover:bg-slate-100/90 focus-visible:ring-2 focus-visible:ring-brand-500",
          compact
            ? "p-1"
            : "border border-slate-200/80 bg-white px-2 py-1.5 shadow-sm hover:border-brand-200",
          open && !compact ? "border-brand-200 bg-brand-50/40" : "",
        ].join(" ")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-xs font-semibold text-brand-800 ring-2 ring-white">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </span>
        {!compact ? (
          <>
            <span className="hidden min-w-0 text-left xl:block">
              <span className="block max-w-[10rem] truncate text-sm font-medium text-slate-900">
                {displayName}
              </span>
              <span className="block max-w-[10rem] truncate text-xs text-slate-500">
                {getRoleLabel(user.role)}
              </span>
            </span>
            <svg
              viewBox="0 0 20 20"
              className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180 text-brand-600" : ""}`}
              fill="currentColor"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </>
        ) : null}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_12px_40px_rgba(20,39,87,0.14)]"
        >
          <div
            className="relative px-4 py-3.5 text-white"
            style={{
              background:
                "linear-gradient(125deg, #142757 0%, #1845b6 50%, #1d6af5 100%)",
            }}
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 18% 40%, #fff 0.7px, transparent 1px)",
                backgroundSize: "18px 18px",
              }}
            />
            <div className="relative flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white/15 text-sm font-semibold text-white ring-2 ring-white/30">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight">
                  {displayName}
                </p>
                <p className="truncate text-xs text-sky-100/85">@{user.username}</p>
                <p className="mt-1 inline-flex rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  {getRoleLabel(user.role)}
                </p>
              </div>
            </div>
          </div>

          <div className="p-2">
            <Link
              role="menuitem"
              to="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm text-slate-700 transition hover:bg-brand-50 hover:text-brand-800"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 0115 0"
                  />
                </svg>
              </span>
              <span className="font-semibold">Profile</span>
            </Link>

            <button
              type="button"
              role="menuitem"
              onClick={() => void handleLogout()}
              className="mt-0.5 flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-sm text-red-700 transition hover:bg-red-50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                  />
                </svg>
              </span>
              <span className="font-semibold">Logout</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
