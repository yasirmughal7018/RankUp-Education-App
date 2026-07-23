import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AppPageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  search?: ReactNode;
  filters?: ReactNode;
  className?: string;
  /** Use Poppins on student-facing pages. */
  studentFacing?: boolean;
  eyebrow?: string;
}

/** Page-level header with optional search, filters, and primary action. */
export function AppPageHeader({
  title,
  subtitle,
  action,
  search,
  filters,
  className,
  studentFacing = false,
  eyebrow,
}: AppPageHeaderProps) {
  return (
    <header className={cn("mb-7 space-y-5", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-3xl">
          {eyebrow ? (
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={cn(
              "text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground sm:text-3xl",
              studentFacing && "font-display",
            )}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground text-balance">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {(search || filters) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {search ? <div className="min-w-0 flex-1">{search}</div> : null}
          {filters ? <div className="shrink-0">{filters}</div> : null}
        </div>
      )}
    </header>
  );
}
