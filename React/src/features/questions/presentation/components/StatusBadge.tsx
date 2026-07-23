import {
  APPROVAL_STATUS_CHIP,
  resolveApprovalStatusKey,
  type ApprovalStatusKey,
} from "@/lib/constants/approval-status";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  label: string;
  status?: ApprovalStatusKey;
  /** @deprecated Prefer `status` — kept for older call sites. */
  tone?: "default" | "success" | "warning" | "danger";
}

const legacyToneToStatus: Record<
  NonNullable<StatusBadgeProps["tone"]>,
  ApprovalStatusKey
> = {
  default: "deactivated",
  success: "approved",
  warning: "pending",
  danger: "rejected",
};

export function StatusBadge({
  label,
  status,
  tone = "default",
}: StatusBadgeProps) {
  const key = status ?? legacyToneToStatus[tone];
  return (
    <span
      className={cn(
        "inline-flex max-w-full whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium",
        APPROVAL_STATUS_CHIP[key],
      )}
    >
      {label}
    </span>
  );
}

export function getQuestionStatusTone(
  status: string,
  isActive: boolean,
): StatusBadgeProps["tone"] {
  const key = resolveApprovalStatusKey(status, isActive);
  if (key === "rejected") return "danger";
  if (key === "pending") return "warning";
  if (key === "approved" || key === "active") return "success";
  return "default";
}

export function getQuestionStatusKey(
  status: string,
  isActive: boolean,
): ApprovalStatusKey {
  return resolveApprovalStatusKey(status, isActive);
}
