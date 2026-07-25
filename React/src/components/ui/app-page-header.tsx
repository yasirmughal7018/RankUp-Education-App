import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
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
  /** Navigate-up target; chevron sits beside the title. */
  backTo?: string;
  onBack?: () => void;
  backAriaLabel?: string;
}

const backControlClassName = cn(
  "group inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
  "border border-border/80 bg-muted/60 text-muted-foreground shadow-sm",
  "transition-all duration-200",
  "hover:border-primary/35 hover:bg-primary/10 hover:text-primary hover:shadow-md hover:shadow-primary/10",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "active:scale-95",
);

/** Page-level header with optional back beside title, search, filters, and primary action. */
export function AppPageHeader({
  title,
  subtitle,
  action,
  search,
  filters,
  className,
  studentFacing = false,
  eyebrow,
  backTo,
  onBack,
  backAriaLabel = "Back",
}: AppPageHeaderProps) {
  const backControl = backTo ? (
    <Link
      to={backTo}
      aria-label={backAriaLabel}
      title={backAriaLabel}
      className={backControlClassName}
    >
      <ChevronLeft className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
    </Link>
  ) : onBack ? (
    <button
      type="button"
      onClick={onBack}
      aria-label={backAriaLabel}
      title={backAriaLabel}
      className={backControlClassName}
    >
      <ChevronLeft className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
    </button>
  ) : null;

  return (
    <header className={cn("mb-7 space-y-5", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 max-w-3xl">
          {eyebrow ? (
            <p
              className={cn(
                "mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary",
                backControl && "sm:pl-12",
              )}
            >
              {eyebrow}
            </p>
          ) : null}
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            {backControl}
            <h1
              className={cn(
                "truncate text-xl font-semibold leading-none tracking-tight text-foreground sm:text-3xl",
                studentFacing && "font-display",
              )}
            >
              {title}
            </h1>
          </div>
          {subtitle ? (
            <p
              className={cn(
                "mt-2 max-w-2xl text-base leading-7 text-muted-foreground text-balance",
                backControl && "sm:pl-12",
              )}
            >
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
