import { STATUS_LABEL, STATUS_TONE, TONE_BADGE_CLASS, resolveStatusKey } from "@/lib/constants/status-colors";
import { cn } from "@/lib/utils";

export interface AppStatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

/** Accessible status chip — color + text label always. */
export function AppStatusBadge({
  status,
  label,
  className,
}: AppStatusBadgeProps) {
  const key = resolveStatusKey(status);
  const tone = STATUS_TONE[key] ?? "neutral";
  const text = label ?? STATUS_LABEL[key] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        TONE_BADGE_CLASS[tone],
        className,
      )}
    >
      <span className="sr-only">Status: </span>
      {text}
    </span>
  );
}
