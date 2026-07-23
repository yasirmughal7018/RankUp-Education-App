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

/** Filter value for people list status dropdowns. */
export type DirectoryAccountStatusFilter = "all" | DirectoryAccountStatus;

/** All statuses shown in directory people list filters. */
export const DIRECTORY_ACCOUNT_STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: DirectoryAccountStatusFilter;
  label: string;
}> = [
  { value: "all", label: "All statuses" },
  { value: "Active", label: "Active" },
  { value: "ApprovedInactive", label: "Approved" },
  { value: "PendingApproval", label: "Pending" },
  { value: "Locked", label: "Locked" },
  { value: "Deactivated", label: "Inactive" },
  { value: "Rejected", label: "Rejected" },
];

/** School/campus ready-state filter (Active | Inactive only). */
export type ReadyStatusFilter = "all" | "active" | "inactive";

export const READY_STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: ReadyStatusFilter;
  label: string;
}> = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

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

/** Whether a row matches the people-list status filter. */
export function matchesDirectoryAccountStatusFilter(
  accountStatus: string | undefined | null,
  isActive: boolean,
  filter: DirectoryAccountStatusFilter,
): boolean {
  if (filter === "all") {
    return true;
  }
  return (
    normalizeDirectoryAccountStatus(accountStatus, isActive) === filter
  );
}

/** Whether a school/campus matches Active|Inactive filter. */
export function matchesReadyStatusFilter(
  isActive: boolean,
  filter: ReadyStatusFilter,
): boolean {
  if (filter === "all") {
    return true;
  }
  return filter === "active" ? isActive : !isActive;
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
