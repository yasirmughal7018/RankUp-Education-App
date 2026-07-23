import type { ComponentType } from "react";
import { NavLink } from "react-router-dom";
import {
  ClipboardList,
  Home,
  LayoutDashboard,
  School,
  GraduationCap,
  BookOpenCheck,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileNavItem = {
  to: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  end?: boolean;
};

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  "/": Home,
  "/dashboard": LayoutDashboard,
  "/admin/directory": School,
  "/quizzes": ClipboardList,
  "/questions": BookOpenCheck,
  "/student/quizzes": GraduationCap,
  "/student/dashboard": GraduationCap,
  "/parent/children": GraduationCap,
  "/parent/quiz-dashboard": ClipboardList,
  "/login": LogIn,
  "/request-access": LogIn,
};

export interface MobileBottomNavProps {
  items: MobileNavItem[];
  className?: string;
}

/** Bottom navigation for phones — large tap targets, max 5 items. */
export function MobileBottomNav({ items, className }: MobileBottomNavProps) {
  const visible = items.slice(0, 5);
  if (visible.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Mobile"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur-md lg:hidden",
        className,
      )}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1.5 py-1.5">
        {visible.map((item) => {
          const Icon = item.icon ?? ICON_MAP[item.to] ?? LayoutDashboard;
          return (
            <li key={`${item.to}-${item.label}`} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-semibold transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground active:bg-muted",
                  )
                }
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span className="max-w-full truncate px-0.5">{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
