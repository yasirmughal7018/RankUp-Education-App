import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

export interface TopbarProps {
  trailing?: ReactNode;
  className?: string;
}

/** Sticky top bar with menu toggle, theme switch, and trailing actions. */
export function Topbar({ trailing, className }: TopbarProps) {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setThemePreference = useUiStore((s) => s.setThemePreference);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/70 bg-card/75 px-3 backdrop-blur-md sm:gap-3 sm:px-6",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-11 w-11 shrink-0 rounded-xl"
        onClick={toggleSidebar}
        aria-label="Toggle navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="min-w-0 lg:hidden">
        <Link to="/" className="block truncate text-base font-semibold text-foreground">
          RankUp
        </Link>
        <p className="truncate text-xs text-muted-foreground">Education</p>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-xl"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => {
            const next = isDark ? "light" : "dark";
            setTheme(next);
            setThemePreference(next);
          }}
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        {trailing}
      </div>
    </header>
  );
}
