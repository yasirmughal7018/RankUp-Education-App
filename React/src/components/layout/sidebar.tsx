import type { ComponentType } from "react";
import { NavLink } from "react-router-dom";
import {
  BookOpenCheck,
  ClipboardList,
  FileCheck2,
  Home,
  LayoutDashboard,
  School,
  ShieldCheck,
  Users,
  GraduationCap,
  BarChart3,
  X,
} from "lucide-react";
import { environment } from "@/app/environment";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/lib/stores/ui-store";

export type SidebarNavItem = {
  to: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  end?: boolean;
};

const DEFAULT_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "/": Home,
  "/dashboard": LayoutDashboard,
  "/admin": ShieldCheck,
  "/admin/directory": School,
  "/questions": BookOpenCheck,
  "/quizzes": ClipboardList,
  "/quizzes/assignments": Users,
  "/quizzes/reviews/pending": FileCheck2,
  "/reports": BarChart3,
  "/parent/children": GraduationCap,
  "/parent/quiz-dashboard": ClipboardList,
  "/student/dashboard": GraduationCap,
  "/student/quizzes": GraduationCap,
};

export interface SidebarProps {
  items: SidebarNavItem[];
  className?: string;
}

/** Desktop sidebar + mobile slide-over drawer. */
export function Sidebar({ items, className }: SidebarProps) {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);

  return (
    <>
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(19rem,90vw)] flex-col border-r border-border/80 bg-card/95 shadow-2xl backdrop-blur transition-transform duration-300 lg:static lg:w-64 lg:shadow-none lg:backdrop-blur-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          !sidebarOpen && "lg:hidden",
          className,
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
              <img
                src="/rankup-mark.svg?v=3"
                alt=""
                className="h-7 w-7"
              />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                RankUp
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Education
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-xl lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="px-3 pb-2">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Navigate
          </p>
        </div>

        <nav
          className="flex-1 space-y-1 overflow-y-auto px-3 pb-4"
          aria-label="Sidebar"
        >
          {items.map((item) => {
            const Icon = item.icon ?? DEFAULT_ICONS[item.to] ?? LayoutDashboard;
            return (
              <NavLink
                key={`${item.to}-${item.label}`}
                to={item.to}
                end={item.end}
                onClick={() => {
                  if (window.matchMedia("(max-width: 1023px)").matches) {
                    setSidebarOpen(false);
                  }
                }}
                className={({ isActive }) =>
                  cn(
                    "group flex min-h-12 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-border/80 p-4">
          <p className="text-xs leading-5 text-muted-foreground">
            {environment.appName}
            <span className="mt-1 block text-[11px] opacity-80">
              Calm tools for schools, families, and learners.
            </span>
          </p>
        </div>
      </aside>
    </>
  );
}
