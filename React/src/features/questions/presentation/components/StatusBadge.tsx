interface StatusBadgeProps {
  label: string;
  tone?: "default" | "success" | "warning" | "danger";
}

const toneClasses = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
};

export function StatusBadge({ label, tone = "default" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}

export function getQuestionStatusTone(
  status: string,
  isActive: boolean,
): StatusBadgeProps["tone"] {
  const normalized = status.toLowerCase();

  if (normalized.includes("reject")) {
    return "danger";
  }

  if (normalized.includes("pending") || normalized.includes("draft")) {
    return "warning";
  }

  if (isActive) {
    return "success";
  }

  return "default";
}
