/**
 * Category overview column (Subject / Class / Difficulty).
 * Shows every lookup with question counts and relative bars for a full picture.
 */
import { cn } from "@/lib/utils";

interface CategoryCountItem {
  id: number;
  label: string;
  count: number;
}

interface QuestionCategoryColumnProps {
  title: string;
  accent: "primary" | "approved" | "pending";
  items: CategoryCountItem[];
  selectedId: number | "";
  loading?: boolean;
  emptyLabel: string;
  onSelect: (id: number | "") => void;
}

const accentStyles = {
  primary: {
    bar: "bg-primary",
    barTrack: "bg-primary/15",
    active:
      "border-primary/40 bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/25",
    badge: "bg-primary text-primary-foreground",
    badgeIdle: "bg-primary/10 text-primary",
  },
  approved: {
    bar: "bg-[var(--status-approved-border)]",
    barTrack: "bg-[var(--status-approved-bg)]",
    active:
      "border-[var(--status-approved-border)] bg-[var(--status-approved-bg)] text-[var(--status-approved-text)] shadow-sm ring-1 ring-[var(--status-approved-border)]",
    badge:
      "bg-[var(--status-approved-border)] text-white dark:text-[var(--status-approved-bg)]",
    badgeIdle:
      "bg-[var(--status-approved-bg)] text-[var(--status-approved-text)]",
  },
  pending: {
    bar: "bg-[var(--status-pending-border)]",
    barTrack: "bg-[var(--status-pending-bg)]",
    active:
      "border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] text-[var(--status-pending-text)] shadow-sm ring-1 ring-[var(--status-pending-border)]",
    badge:
      "bg-[var(--status-pending-border)] text-white dark:text-[var(--status-pending-bg)]",
    badgeIdle:
      "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]",
  },
} as const;

export function QuestionCategoryColumn({
  title,
  accent,
  items,
  selectedId,
  loading = false,
  emptyLabel,
  onSelect,
}: QuestionCategoryColumnProps) {
  const styles = accentStyles[accent];
  const maxCount = Math.max(1, ...items.map((item) => item.count));
  const totalQuestions = items.reduce((sum, item) => sum + item.count, 0);
  const withQuestions = items.filter((item) => item.count > 0).length;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="mb-3 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <div className="flex shrink-0 items-center gap-2">
            {selectedId !== "" ? (
              <button
                type="button"
                onClick={() => onSelect("")}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                Clear
              </button>
            ) : null}
            <span
              className="inline-flex items-center justify-center rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground"
              title={`${items.length} ${title.toLowerCase()} · ${totalQuestions} questions`}
            >
              {totalQuestions}
            </span>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {items.length} listed · {withQuestions} in use · {totalQuestions}{" "}
          question{totalQuestions === 1 ? "" : "s"}
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="h-14 animate-pulse rounded-xl bg-muted/70"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        </div>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
          {items.map((item) => {
            const active = selectedId === item.id;
            const widthPct = Math.max(
              item.count > 0 ? 8 : 0,
              Math.round((item.count / maxCount) * 100),
            );
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(active ? "" : item.id)}
                  aria-pressed={active}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-left transition",
                    active
                      ? styles.active
                      : "border-border/70 bg-background text-foreground hover:border-border hover:bg-muted/50",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium">
                      {item.label}
                    </span>
                    <span
                      className={cn(
                        "inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                        active ? styles.badge : styles.badgeIdle,
                      )}
                    >
                      {item.count}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "mt-2 h-1.5 overflow-hidden rounded-full",
                      styles.barTrack,
                    )}
                  >
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        styles.bar,
                      )}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
