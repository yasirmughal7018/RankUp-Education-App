interface CategoryCountItem {
  id: number;
  label: string;
  count: number;
}

interface QuestionCategoryColumnProps {
  title: string;
  subtitle: string;
  accent: "teal" | "indigo" | "amber";
  items: CategoryCountItem[];
  selectedId: number | "";
  loading?: boolean;
  emptyLabel: string;
  onSelect: (id: number | "") => void;
}

const accentStyles = {
  teal: {
    shell: "from-teal-50/90 via-white to-white border-teal-100",
    eyebrow: "text-teal-700",
    bar: "bg-teal-500",
    barTrack: "bg-teal-100",
    active:
      "border-teal-400 bg-teal-50 text-teal-950 shadow-sm ring-1 ring-teal-200",
    badge: "bg-teal-600 text-white",
    badgeIdle: "bg-teal-50 text-teal-800",
  },
  indigo: {
    shell: "from-indigo-50/90 via-white to-white border-indigo-100",
    eyebrow: "text-indigo-700",
    bar: "bg-indigo-500",
    barTrack: "bg-indigo-100",
    active:
      "border-indigo-400 bg-indigo-50 text-indigo-950 shadow-sm ring-1 ring-indigo-200",
    badge: "bg-indigo-600 text-white",
    badgeIdle: "bg-indigo-50 text-indigo-800",
  },
  amber: {
    shell: "from-amber-50/90 via-white to-white border-amber-100",
    eyebrow: "text-amber-800",
    bar: "bg-amber-500",
    barTrack: "bg-amber-100",
    active:
      "border-amber-400 bg-amber-50 text-amber-950 shadow-sm ring-1 ring-amber-200",
    badge: "bg-amber-600 text-white",
    badgeIdle: "bg-amber-50 text-amber-900",
  },
} as const;

export function QuestionCategoryColumn({
  title,
  subtitle,
  accent,
  items,
  selectedId,
  loading = false,
  emptyLabel,
  onSelect,
}: QuestionCategoryColumnProps) {
  const styles = accentStyles[accent];
  const maxCount = Math.max(1, ...items.map((item) => item.count));
  const totalCount = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-3xl border bg-gradient-to-b p-4 shadow-sm ${styles.shell}`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${styles.eyebrow}`}
          >
            Category
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-900">
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-semibold tabular-nums text-slate-900">
            {items.length}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">
            {totalCount} qs
          </p>
        </div>
      </div>

      {selectedId !== "" ? (
        <button
          type="button"
          onClick={() => onSelect("")}
          className="mb-3 self-start rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Clear {title.toLowerCase()} filter
        </button>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-14 animate-pulse rounded-2xl bg-slate-100/80"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-8 text-center">
          <p className="text-sm text-slate-500">{emptyLabel}</p>
        </div>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {items.map((item) => {
            const active = selectedId === item.id;
            const widthPct = Math.max(
              4,
              Math.round((item.count / maxCount) * 100),
            );
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(active ? "" : item.id)}
                  aria-pressed={active}
                  className={`w-full rounded-2xl border px-3 py-2.5 text-left transition ${
                    active
                      ? styles.active
                      : "border-slate-100 bg-white/80 text-slate-800 hover:border-slate-200 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium">
                      {item.label}
                    </span>
                    <span
                      className={`inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                        active ? styles.badge : styles.badgeIdle
                      }`}
                    >
                      {item.count}
                    </span>
                  </div>
                  <div
                    className={`mt-2 h-1.5 overflow-hidden rounded-full ${styles.barTrack}`}
                  >
                    <div
                      className={`h-full rounded-full transition-all ${styles.bar}`}
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
