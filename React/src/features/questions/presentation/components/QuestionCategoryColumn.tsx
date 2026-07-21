/**
 * Filter column for Subject / Class / Difficulty on the question bank dashboard.
 * Relative bar width is normalized to the max count in the column.
 */
interface CategoryCountItem {
  id: number;
  label: string;
  count: number;
}

interface QuestionCategoryColumnProps {
  title: string;
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
    bar: "bg-teal-500",
    barTrack: "bg-teal-100",
    active:
      "border-teal-400 bg-teal-50 text-teal-950 shadow-sm ring-1 ring-teal-200",
    badge: "bg-teal-600 text-white",
    badgeIdle: "bg-teal-50 text-teal-800",
  },
  indigo: {
    shell: "from-indigo-50/90 via-white to-white border-indigo-100",
    bar: "bg-indigo-500",
    barTrack: "bg-indigo-100",
    active:
      "border-indigo-400 bg-indigo-50 text-indigo-950 shadow-sm ring-1 ring-indigo-200",
    badge: "bg-indigo-600 text-white",
    badgeIdle: "bg-indigo-50 text-indigo-800",
  },
  amber: {
    shell: "from-amber-50/90 via-white to-white border-amber-100",
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
  accent,
  items,
  selectedId,
  loading = false,
  emptyLabel,
  onSelect,
}: QuestionCategoryColumnProps) {
  const styles = accentStyles[accent];
  // Floor at 1 so empty columns still render a tiny bar without divide-by-zero.
  const maxCount = Math.max(1, ...items.map((item) => item.count));

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-3xl border bg-gradient-to-b p-4 shadow-sm ${styles.shell}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <div className="flex shrink-0 items-center gap-2">
          {selectedId !== "" ? (
            <button
              type="button"
              onClick={() => onSelect("")}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Clear
            </button>
          ) : null}
          <span
            className="inline-flex min-w-8 items-center justify-center rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-700 ring-1 ring-slate-200/80"
            title={`${items.length} ${title.toLowerCase()}${items.length === 1 ? "" : "s"}`}
          >
            {items.length}
          </span>
        </div>
      </div>

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
            // Relative bar; minimum 4% so zero-count items stay visible.
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
