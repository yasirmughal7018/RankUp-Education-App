interface QuestionBankStatTileProps {
  label: string;
  value: number;
  active?: boolean;
  accent?: "brand" | "amber" | "emerald" | "rose" | "slate";
  onClick: () => void;
}

const accentActive: Record<
  NonNullable<QuestionBankStatTileProps["accent"]>,
  string
> = {
  brand: "border-brand-400 bg-brand-50 ring-brand-200",
  amber: "border-amber-400 bg-amber-50 ring-amber-200",
  emerald: "border-emerald-400 bg-emerald-50 ring-emerald-200",
  rose: "border-rose-400 bg-rose-50 ring-rose-200",
  slate: "border-slate-400 bg-slate-100 ring-slate-200",
};

const accentIdle: Record<
  NonNullable<QuestionBankStatTileProps["accent"]>,
  string
> = {
  brand: "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/40",
  amber: "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/40",
  emerald:
    "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40",
  rose: "border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50/40",
  slate: "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
};

const valueColor: Record<
  NonNullable<QuestionBankStatTileProps["accent"]>,
  string
> = {
  brand: "text-brand-800",
  amber: "text-amber-800",
  emerald: "text-emerald-800",
  rose: "text-rose-800",
  slate: "text-slate-800",
};

export function QuestionBankStatTile({
  label,
  value,
  active = false,
  accent = "slate",
  onClick,
}: QuestionBankStatTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-w-0 rounded-2xl border p-3 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:p-4 ${
        active ? `${accentActive[accent]} ring-2` : accentIdle[accent]
      }`}
    >
      <p className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs">
        {label}
      </p>
      <p
        className={`mt-1.5 text-2xl font-semibold tabular-nums sm:mt-2 sm:text-3xl ${valueColor[accent]}`}
      >
        {value}
      </p>
    </button>
  );
}
