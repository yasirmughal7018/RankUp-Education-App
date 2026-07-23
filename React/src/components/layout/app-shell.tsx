import type { ReactNode } from "react";
import { useEffect } from "react";
import { Sidebar, type SidebarNavItem } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

export interface AppShellProps {
  navItems: SidebarNavItem[];
  mobileNavItems?: SidebarNavItem[];
  topbarTrailing?: ReactNode;
  children: ReactNode;
  role?: string | null;
  hideChrome?: boolean;
  className?: string;
}

/**
 * App chrome: desktop sidebar, topbar, mobile bottom nav, main content.
 * Soft atmosphere + role accent for a calm education feel.
 */
export function AppShell({
  navItems,
  mobileNavItems,
  topbarTrailing,
  children,
  role,
  hideChrome = false,
  className,
}: AppShellProps) {
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);

  // Desktop: open sidebar. Mobile: keep drawer closed until the user opens it.
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setSidebarOpen(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [setSidebarOpen]);

  if (hideChrome) {
    return (
      <div
        className={cn(
          "app-atmosphere min-h-screen text-foreground",
          className,
        )}
      >
        {children}
      </div>
    );
  }

  const bottomItems = mobileNavItems ?? navItems;

  return (
    <div
      data-role={role ?? undefined}
      className={cn(
        "app-atmosphere flex min-h-screen text-foreground",
        className,
      )}
    >
      <Sidebar items={navItems} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar trailing={topbarTrailing} />
        <main
          id="main-content"
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8"
        >
          <div className="pb-24 lg:pb-4">{children}</div>
        </main>
        <MobileBottomNav items={bottomItems} />
      </div>
    </div>
  );
}
