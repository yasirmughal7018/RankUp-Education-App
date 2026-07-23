/**
 * Status → semantic color mapping for badges and chips.
 * Always pair color with a text label (accessibility).
 */

export type StatusTone =
  | "success"
  | "primary"
  | "warning"
  | "ai"
  | "danger"
  | "neutral"
  | "achievement";

export type AppStatusKey =
  | "active"
  | "completed"
  | "inprogress"
  | "pending"
  | "underreview"
  | "expired"
  | "cancelled"
  | "draft"
  | "notassigned"
  | "published"
  | "assigned"
  | "approved"
  | "rejected"
  | "archived"
  | "inactive";

const STATUS_ALIASES: Record<string, AppStatusKey> = {
  active: "active",
  completed: "completed",
  complete: "completed",
  done: "completed",
  "in progress": "inprogress",
  inprogress: "inprogress",
  in_progress: "inprogress",
  pending: "pending",
  pendingreview: "underreview",
  "pending review": "underreview",
  "under review": "underreview",
  underreview: "underreview",
  "under ai review": "underreview",
  "teacher review": "underreview",
  expired: "expired",
  cancelled: "cancelled",
  canceled: "cancelled",
  draft: "draft",
  "not assigned": "notassigned",
  notassigned: "notassigned",
  unpublished: "notassigned",
  published: "published",
  assigned: "assigned",
  approved: "approved",
  rejected: "rejected",
  declined: "rejected",
  archived: "archived",
  inactive: "inactive",
};

export const STATUS_TONE: Record<AppStatusKey, StatusTone> = {
  active: "success",
  completed: "success",
  inprogress: "primary",
  pending: "warning",
  underreview: "ai",
  expired: "danger",
  cancelled: "danger",
  draft: "neutral",
  notassigned: "neutral",
  published: "primary",
  assigned: "achievement",
  approved: "success",
  rejected: "danger",
  archived: "neutral",
  inactive: "neutral",
};

export const STATUS_LABEL: Record<AppStatusKey, string> = {
  active: "Active",
  completed: "Completed",
  inprogress: "In Progress",
  pending: "Pending",
  underreview: "Under Review",
  expired: "Expired",
  cancelled: "Cancelled",
  draft: "Draft",
  notassigned: "Not Assigned",
  published: "Published",
  assigned: "Assigned",
  approved: "Approved",
  rejected: "Rejected",
  archived: "Archived",
  inactive: "Inactive",
};

/** Normalize free-form status text to a known key. */
export function resolveStatusKey(status: string): AppStatusKey {
  const key = status.trim().toLowerCase().replace(/\s+/g, " ");
  const compact = key.replace(/\s+/g, "");
  return STATUS_ALIASES[key] ?? STATUS_ALIASES[compact] ?? "draft";
}

export function statusToneFor(status: string): StatusTone {
  const key = resolveStatusKey(status);
  return STATUS_TONE[key] ?? "neutral";
}

/** Tailwind classes for tone chips (background / text / border). */
export const TONE_BADGE_CLASS: Record<StatusTone, string> = {
  success:
    "border-success/20 bg-[hsl(var(--success-light))] text-[hsl(var(--success))]",
  primary:
    "border-primary/20 bg-[hsl(var(--primary-light))] text-primary",
  warning:
    "border-warning/25 bg-[hsl(var(--warning-light))] text-[hsl(var(--warning))]",
  ai: "border-[hsl(var(--ai))]/25 bg-[hsl(var(--ai-light))] text-[hsl(var(--ai))]",
  achievement:
    "border-[hsl(var(--achievement))]/25 bg-[hsl(var(--achievement-light))] text-[hsl(var(--achievement))]",
  danger:
    "border-destructive/25 bg-[hsl(var(--destructive-light))] text-destructive",
  neutral: "border-border bg-muted text-muted-foreground",
};

export const TONE_STAT_CLASS: Record<StatusTone | "danger", string> = {
  primary: "text-primary",
  success: "text-[hsl(var(--success))]",
  warning: "text-[hsl(var(--warning))]",
  ai: "text-[hsl(var(--ai))]",
  achievement: "text-[hsl(var(--achievement))]",
  danger: "text-destructive",
  neutral: "text-muted-foreground",
};
