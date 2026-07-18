import type { DirectoryAccountStatus } from "@/features/directory/domain/directoryTypes";

const LABELS: Record<DirectoryAccountStatus, string> = {
  Active: "Active",
  ApprovedInactive: "Approved (Inactive)",
  PendingApproval: "Pending approval",
  Locked: "Locked",
  Deactivated: "Deactivated",
  Rejected: "Rejected",
};

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

export function directoryAccountStatusLabel(
  code: DirectoryAccountStatus,
): string {
  return LABELS[code];
}

export function directoryAccountStatusClass(
  code: DirectoryAccountStatus | "Inactive",
): string {
  switch (code) {
    case "Active":
      return "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200/80";
    case "ApprovedInactive":
      return "bg-sky-50 text-sky-900 ring-1 ring-inset ring-sky-200/80";
    case "PendingApproval":
      return "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200/80";
    case "Locked":
      return "bg-orange-50 text-orange-900 ring-1 ring-inset ring-orange-200/80";
    case "Rejected":
      return "bg-rose-50 text-rose-900 ring-1 ring-inset ring-rose-200/80";
    case "Inactive":
    case "Deactivated":
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200/80";
  }
}
