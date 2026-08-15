import { Check, X } from "lucide-react";
import type { PendingRoleRequestItem } from "@/features/admin/data/roleRequestApi";
import { getRoleLabel, type UserRole } from "@/core/api/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RoleRequestDetailsDialogProps {
  request: PendingRoleRequestItem;
  schoolName: string;
  campusName: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-3 sm:gap-2 text-sm">
      <dt className="font-medium text-slate-600">{label}</dt>
      <dd className="whitespace-pre-wrap break-words text-slate-900 sm:col-span-2">
        {value}
      </dd>
    </div>
  );
}

function roleBadgeClass(role: string): string {
  switch (role) {
    case "Student":
      return "border border-primary/25 bg-primary/10 text-primary";
    case "Parent":
      return "border border-[hsl(var(--achievement))]/25 bg-[hsl(var(--achievement-light))] text-[hsl(var(--achievement))]";
    case "Teacher":
      return "border border-[hsl(var(--ai))]/25 bg-[hsl(var(--ai-light))] text-[hsl(var(--ai))]";
    case "Tutor":
      return "border border-brand-200 bg-brand-50 text-brand-700";
    default:
      return "border border-border bg-muted text-muted-foreground";
  }
}

function initialsFromName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** Full-detail popup for an additional-role request with approve/reject actions. */
export function RoleRequestDetailsDialog({
  request,
  schoolName,
  campusName,
  isSubmitting,
  onClose,
  onApprove,
  onReject,
}: RoleRequestDetailsDialogProps) {
  const existingRoles = request.existingRoles?.length
    ? request.existingRoles
    : [request.activeRole];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-3 sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close details"
        className="absolute inset-0 cursor-default"
        onClick={() => {
          if (!isSubmitting) {
            onClose();
          }
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-request-detail-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <p className="text-sm font-semibold text-slate-900">Role request</p>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-70"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <div className="mb-4 flex items-center gap-3 sm:mb-5">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-sm font-bold tracking-wide text-brand-800 ring-2 ring-white shadow-sm sm:h-14 sm:w-14">
              {initialsFromName(request.fullName)}
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="role-request-detail-title"
                className="truncate text-[15px] font-semibold tracking-tight text-slate-900"
              >
                {request.fullName}
              </h2>
              <p className="mt-0.5 truncate text-xs font-medium text-slate-400">
                {request.username}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                roleBadgeClass(request.requestedRole),
              )}
            >
              Requesting {getRoleLabel(request.requestedRole as UserRole)}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(14rem,0.8fr)]">
            <dl className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <DetailRow label="Full name" value={request.fullName} />
              <DetailRow label="Username" value={request.username} />
              <DetailRow
                label="Current roles"
                value={existingRoles
                  .map((role) => getRoleLabel(role as UserRole))
                  .join(", ")}
              />
              <DetailRow
                label="Active role"
                value={getRoleLabel(request.activeRole as UserRole)}
              />
              <DetailRow
                label="Requested role"
                value={getRoleLabel(request.requestedRole as UserRole)}
              />
              <DetailRow label="School" value={schoolName} />
              <DetailRow label="Campus" value={campusName || "—"} />
              <DetailRow
                label={
                  request.requestedRole === "Coordinator"
                    ? "Coordinator code"
                    : "Teacher code"
                }
                value={request.teacherCode || "—"}
              />
              <DetailRow
                label="Reason"
                value={request.reasonMessage || "—"}
              />
              <DetailRow
                label="Requested"
                value={formatDateTime(request.requestedAt)}
              />
            </dl>

            <aside className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Actions</p>
                <p className="mt-1 text-xs text-slate-500">
                  Approving adds the role immediately. The user can switch roles
                  from their profile menu.
                </p>
              </div>
              <div className="mt-auto flex flex-col gap-2 border-t border-slate-100 pt-3">
                <Button
                  type="button"
                  className="w-full"
                  disabled={isSubmitting}
                  onClick={onApprove}
                >
                  <Check className="h-4 w-4" />
                  {isSubmitting ? "Approving…" : "Approve"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  disabled={isSubmitting}
                  onClick={onReject}
                >
                  <X className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
