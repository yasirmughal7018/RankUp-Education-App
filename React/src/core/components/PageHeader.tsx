import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Navigate-up target; chevron sits beside the title. */
  backTo?: string;
  /** Alternate to backTo for history/state navigation. */
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

/** Page title block with optional back chevron beside the title and action slot. */
export function PageHeader({
  title,
  description,
  action,
  backTo,
  onBack,
  backAriaLabel = "Back",
}: PageHeaderProps) {
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
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          {backControl}
          <h1 className="truncate text-xl font-semibold leading-none tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
        </div>
        {description ? (
          <p
            className={cn(
              "mt-2 max-w-3xl text-sm leading-5 text-muted-foreground sm:text-base sm:leading-6",
              backControl && "sm:pl-12",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
