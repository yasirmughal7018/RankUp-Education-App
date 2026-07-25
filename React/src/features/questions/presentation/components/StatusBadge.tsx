/**
 * Question / approval status badges.
 * Workflow status and IsActive activity use separate theme keys per QA guide.
 */
import {
  isApprovedQuestionStatus,
  isArchivedQuestionStatus,
  isDraftQuestionStatus,
  isPendingQuestionStatus,
  isRejectedQuestionStatus,
} from "@/features/questions/domain/questionTypes";
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

/**
 * Workflow QuestionStatus → theme key.
 * Does not use IsActive. Archived uses slate (deactivated tokens).
 * Legacy status name "Active"/"Published" maps to Approved (green), not Active (blue).
 */
export function getQuestionWorkflowStatusKey(status: string): ApprovalStatusKey {
  if (isRejectedQuestionStatus(status)) return "rejected";
  if (isPendingQuestionStatus(status) || isDraftQuestionStatus(status)) {
    return "pending";
  }
  if (isArchivedQuestionStatus(status)) return "deactivated";
  if (isApprovedQuestionStatus(status)) return "approved";
  return "deactivated";
}

/** IsActive flag → theme key (Active=blue, Inactive=slate). */
export function getQuestionActivityStatusKey(
  isActive: boolean,
): ApprovalStatusKey {
  return isActive ? "active" : "deactivated";
}

/**
 * @deprecated Prefer getQuestionWorkflowStatusKey for question bank status.
 * Kept for non-question call sites that still pass free-form status text.
 */
export function getQuestionStatusTone(
  status: string,
  isActive?: boolean,
): StatusBadgeProps["tone"] {
  // Prefer workflow mapping when this looks like a question status.
  if (
    isPendingQuestionStatus(status) ||
    isApprovedQuestionStatus(status) ||
    isRejectedQuestionStatus(status) ||
    isArchivedQuestionStatus(status) ||
    isDraftQuestionStatus(status)
  ) {
    const key = getQuestionWorkflowStatusKey(status);
    if (key === "rejected") return "danger";
    if (key === "pending") return "warning";
    if (key === "approved") return "success";
    return "default";
  }

  const key = resolveApprovalStatusKey(status, isActive);
  if (key === "rejected") return "danger";
  if (key === "pending") return "warning";
  if (key === "approved" || key === "active") return "success";
  return "default";
}

/**
 * Question workflow status theme key.
 * `isActive` is ignored so Approved+inactive stays green (Approved), not conflated.
 */
export function getQuestionStatusKey(
  status: string,
  _isActive?: boolean,
): ApprovalStatusKey {
  return getQuestionWorkflowStatusKey(status);
}
