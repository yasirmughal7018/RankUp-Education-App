/**
 * Approval / account status theme helpers.
 * Colors come from CSS variables in theme.css (--status-*-bg/text/border).
 */

export type ApprovalStatusKey =
  | "pending"
  | "approved"
  | "locked"
  | "deactivated"
  | "rejected"
  | "active";

/** Filled chip / badge surfaces. */
export const APPROVAL_STATUS_CHIP: Record<ApprovalStatusKey, string> = {
  pending:
    "border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]",
  approved:
    "border-[var(--status-approved-border)] bg-[var(--status-approved-bg)] text-[var(--status-approved-text)]",
  locked:
    "border-[var(--status-locked-border)] bg-[var(--status-locked-bg)] text-[var(--status-locked-text)]",
  deactivated:
    "border-[var(--status-deactivated-border)] bg-[var(--status-deactivated-bg)] text-[var(--status-deactivated-text)]",
  rejected:
    "border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)] text-[var(--status-rejected-text)]",
  active:
    "border-[var(--status-active-border)] bg-[var(--status-active-bg)] text-[var(--status-active-text)]",
};

/** Selected approval-system tile. */
export const APPROVAL_STATUS_TILE_ACTIVE: Record<ApprovalStatusKey, string> = {
  pending:
    "border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] ring-[var(--status-pending-border)]",
  approved:
    "border-[var(--status-approved-border)] bg-[var(--status-approved-bg)] ring-[var(--status-approved-border)]",
  locked:
    "border-[var(--status-locked-border)] bg-[var(--status-locked-bg)] ring-[var(--status-locked-border)]",
  deactivated:
    "border-[var(--status-deactivated-border)] bg-[var(--status-deactivated-bg)] ring-[var(--status-deactivated-border)]",
  rejected:
    "border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)] ring-[var(--status-rejected-border)]",
  active:
    "border-[var(--status-active-border)] bg-[var(--status-active-bg)] ring-[var(--status-active-border)]",
};

/** Idle approval-system tile (hover uses status border). */
export const APPROVAL_STATUS_TILE_IDLE: Record<ApprovalStatusKey, string> = {
  pending:
    "border-border bg-card hover:border-[var(--status-pending-border)] hover:bg-[var(--status-pending-bg)]/50",
  approved:
    "border-border bg-card hover:border-[var(--status-approved-border)] hover:bg-[var(--status-approved-bg)]/50",
  locked:
    "border-border bg-card hover:border-[var(--status-locked-border)] hover:bg-[var(--status-locked-bg)]/50",
  deactivated:
    "border-border bg-card hover:border-[var(--status-deactivated-border)] hover:bg-[var(--status-deactivated-bg)]/50",
  rejected:
    "border-border bg-card hover:border-[var(--status-rejected-border)] hover:bg-[var(--status-rejected-bg)]/50",
  active:
    "border-border bg-card hover:border-[var(--status-active-border)] hover:bg-[var(--status-active-bg)]/50",
};

export const APPROVAL_STATUS_VALUE: Record<ApprovalStatusKey, string> = {
  pending: "text-[var(--status-pending-text)]",
  approved: "text-[var(--status-approved-text)]",
  locked: "text-[var(--status-locked-text)]",
  deactivated: "text-[var(--status-deactivated-text)]",
  rejected: "text-[var(--status-rejected-text)]",
  active: "text-[var(--status-active-text)]",
};

/** Map free-form question / account status text → theme key. */
export function resolveApprovalStatusKey(
  status: string,
  isActive?: boolean,
): ApprovalStatusKey {
  const s = status.trim().toLowerCase();
  if (s.includes("reject") || s.includes("declin")) return "rejected";
  if (s.includes("pending") || s.includes("draft") || s.includes("review")) {
    return "pending";
  }
  if (s.includes("lock")) return "locked";
  if (s.includes("deactiv") || s.includes("archiv") || s === "inactive") {
    return "deactivated";
  }
  if (s.includes("approv")) return "approved";
  if (isActive === true || s.includes("active")) return "active";
  if (isActive === false) return "deactivated";
  return "deactivated";
}
