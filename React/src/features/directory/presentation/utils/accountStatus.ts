import type { DirectoryAccountStatus } from "@/features/directory/domain/directoryTypes";
import {
  APPROVAL_STATUS_CHIP,
  type ApprovalStatusKey,
} from "@/lib/constants/approval-status";

const LABELS: Record<DirectoryAccountStatus, string> = {
  Active: "Active",
  ApprovedInactive: "Approved",
  PendingApproval: "Pending",
  Locked: "Locked",
  Deactivated: "Inactive",
  Rejected: "Rejected",
};

const STATUS_KEY: Record<DirectoryAccountStatus | "Inactive", ApprovalStatusKey> =
  {
    Active: "active",
    ApprovedInactive: "approved",
    PendingApproval: "pending",
    Locked: "locked",
    Deactivated: "deactivated",
    Rejected: "rejected",
    Inactive: "deactivated",
  };

/** Coerce API status string; fallback from isActive. */
export function normalizeDirectoryAccountStatus(
  value: string | undefined | null,
  isActive: boolean,
): DirectoryAccountStatus {
  if (
    value === "Active" ||
    value === "ApprovedInactive" ||
    value === "PendingApproval" ||
    value === "Locked" ||
    value === "Deactivated" ||
    value === "Rejected"
  ) {
    return value;
  }
  return isActive ? "Active" : "Deactivated";
}

/** Display label for directory account status. */
export function directoryAccountStatusLabel(
  code: DirectoryAccountStatus,
): string {
  return LABELS[code];
}

/** Theme-token classes for status badge (light + dark). */
export function directoryAccountStatusClass(
  code: DirectoryAccountStatus | "Inactive",
): string {
  return APPROVAL_STATUS_CHIP[STATUS_KEY[code]];
}

/** School / campus Active|Inactive chip — same green Active as summary tiles. */
export function directoryReadyStatusClass(isActive: boolean): string {
  return isActive
    ? APPROVAL_STATUS_CHIP.active
    : APPROVAL_STATUS_CHIP.deactivated;
}
