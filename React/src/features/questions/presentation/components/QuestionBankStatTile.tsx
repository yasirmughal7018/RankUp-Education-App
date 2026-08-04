/**
 * Clickable approval-system stat tile on the question bank dashboard.
 * Colors come from theme.css status tokens (light + dark).
 */
import {
  APPROVAL_STATUS_TILE_ACTIVE,
  APPROVAL_STATUS_TILE_IDLE,
  APPROVAL_STATUS_VALUE,
  type ApprovalStatusKey,
} from "@/lib/constants/approval-status";
import { cn } from "@/lib/utils";

interface QuestionBankStatTileProps {
  label: string;
  value: number;
  active?: boolean;
  status: ApprovalStatusKey;
  onClick: () => void;
}

export function QuestionBankStatTile({
  label,
  value,
  active = false,
  status,
  onClick,
}: QuestionBankStatTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-w-0 rounded-2xl border p-3 text-center shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-4",
        active
          ? cn(APPROVAL_STATUS_TILE_ACTIVE[status], "ring-2")
          : APPROVAL_STATUS_TILE_IDLE[status],
      )}
    >
      <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 text-2xl font-semibold tabular-nums sm:mt-2 sm:text-3xl",
          APPROVAL_STATUS_VALUE[status],
        )}
      >
        {value}
      </p>
    </button>
  );
}
