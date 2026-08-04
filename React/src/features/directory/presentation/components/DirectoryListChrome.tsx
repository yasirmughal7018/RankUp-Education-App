import type { ComponentProps, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, type LucideIcon } from "lucide-react";
import { AppCard } from "@/components/ui/app-card";
import { AppEmptyState } from "@/components/ui/app-empty-state";
import { AppErrorState } from "@/components/ui/app-error-state";
import { AppLoadingSkeleton } from "@/components/ui/app-loading-skeleton";
import { Button } from "@/components/ui/button";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";
import { cn } from "@/lib/utils";

/** Shared themed select for directory filters. */
export const directorySelectClassName = cn(FORM_FIELD_CLASS, "h-11 min-w-0");

interface DirectoryPageShellProps {
  title: string;
  primaryAction?: ReactNode;
  children: ReactNode;
}

/** Consistent page chrome for admin directory lists. */
export function DirectoryPageShell({
  title,
  primaryAction,
  children,
}: DirectoryPageShellProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 sm:py-8 lg:py-10">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <Link
            to="/admin/directory"
            aria-label="Back to directory"
            title="Back to directory"
            className={cn(
              "group inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              "border border-border/80 bg-muted/60 text-muted-foreground shadow-sm",
              "transition-all duration-200",
              "hover:border-primary/35 hover:bg-primary/10 hover:text-primary hover:shadow-md hover:shadow-primary/10",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "active:scale-95",
            )}
          >
            <ChevronLeft className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          </Link>
          <h1 className="truncate text-xl font-semibold leading-none tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
        </div>
        {primaryAction ? (
          <div className="shrink-0">{primaryAction}</div>
        ) : null}
      </header>
      {children}
    </div>
  );
}

interface DirectoryIconActionProps
  extends Omit<ComponentProps<typeof Button>, "children" | "size"> {
  icon: LucideIcon;
  label: string;
}

/** Compact themed icon button for row actions (Edit, Activate, Link…). */
export function DirectoryIconAction({
  icon: Icon,
  label,
  className,
  variant = "outline",
  ...props
}: DirectoryIconActionProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size="icon"
      className={cn("h-9 w-9 rounded-lg", className)}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

interface DirectoryFilterPanelProps {
  children: ReactNode;
  className?: string;
}

/** Soft filter surface that stacks cleanly on mobile. */
export function DirectoryFilterPanel({
  children,
  className,
}: DirectoryFilterPanelProps) {
  return (
    <AppCard className={cn("space-y-3", className)} padded>
      {children}
    </AppCard>
  );
}

interface DirectoryFlashProps {
  error?: string | null;
  success?: string | null;
  onRetry?: () => void;
}

/** Theme-aware feedback banners for list actions. */
export function DirectoryFlash({ error, success, onRetry }: DirectoryFlashProps) {
  return (
    <>
      {error ? (
        <AppErrorState message={error} onRetry={onRetry} />
      ) : null}
      {success ? (
        <div
          role="status"
          className="rounded-xl border border-[var(--status-approved-border)] bg-[var(--status-approved-bg)] px-4 py-3 text-sm text-[var(--status-approved-text)]"
        >
          {success}
        </div>
      ) : null}
    </>
  );
}

interface DirectoryBulkBarProps {
  count: number;
  children: ReactNode;
}

/** Sticky-feeling selection bar for bulk actions. */
export function DirectoryBulkBar({ count, children }: DirectoryBulkBarProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-foreground">
        {count} selected
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

interface DirectoryListPanelProps {
  loading?: boolean;
  empty?: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** List container with loading / empty states. */
export function DirectoryListPanel({
  loading,
  empty,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  children,
  footer,
}: DirectoryListPanelProps) {
  return (
    <AppCard padded={false} className="overflow-hidden">
      {loading ? (
        <div className="p-4 sm:p-5">
          <AppLoadingSkeleton variant="table" count={6} />
        </div>
      ) : empty ? (
        <div className="p-4 sm:p-5">
          <AppEmptyState
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={emptyActionLabel}
            onAction={onEmptyAction}
          />
        </div>
      ) : (
        <>
          {children}
          {footer}
        </>
      )}
    </AppCard>
  );
}

interface DirectoryEntityCardProps {
  selected?: boolean;
  onSelect?: () => void;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  leading?: ReactNode;
}

/** Mobile-first person/entity card used under md breakpoint. */
export function DirectoryEntityCard({
  selected,
  onSelect,
  title,
  subtitle,
  meta,
  badge,
  actions,
  leading,
}: DirectoryEntityCardProps) {
  return (
    <article className="rounded-xl border border-border/80 bg-card px-4 py-3.5 shadow-sm">
      <div className="flex items-start gap-3">
        {onSelect ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-ring"
            aria-label={`Select ${title}`}
          />
        ) : null}
        {leading}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-foreground">
                {title}
              </h3>
              {subtitle ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}
            </div>
            {badge}
          </div>
          {meta ? (
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              {meta}
            </div>
          ) : null}
          {actions ? (
            <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

interface DirectoryTableProps {
  children: ReactNode;
}

/** Desktop table wrapper — hidden on small screens. */
export function DirectoryTable({ children }: DirectoryTableProps) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="min-w-full divide-y divide-border text-sm">
        {children}
      </table>
    </div>
  );
}

interface DirectoryMobileListProps {
  children: ReactNode;
}

/** Mobile card stack — hidden from md up. */
export function DirectoryMobileList({ children }: DirectoryMobileListProps) {
  return <div className="space-y-3 p-3 md:hidden sm:p-4">{children}</div>;
}

export function DirectoryTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-muted/60">
      <tr>{children}</tr>
    </thead>
  );
}

export function DirectoryTh({
  children,
  className,
  align = "left",
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function DirectoryTd({
  children,
  className,
  align = "left",
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <td
      className={cn(
        "px-4 py-3.5 align-middle text-foreground",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </td>
  );
}
