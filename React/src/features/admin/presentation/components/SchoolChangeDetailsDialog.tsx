import { Check, X } from "lucide-react";
import type { PendingSchoolChangeItem } from "@/features/admin/data/schoolChangeApi";
import { getRoleLabel, type UserRole } from "@/core/api/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SchoolChangeDetailsDialogProps {
  request: PendingSchoolChangeItem;
  fromSchoolName: string;
  fromCampusName: string | null;
  toSchoolName: string;
  toCampusName: string | null;
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
    case "Teacher":
      return "border border-[hsl(var(--ai))]/25 bg-[hsl(var(--ai-light))] text-[hsl(var(--ai))]";
    case "CampusAdmin":
      return "border border-border bg-muted text-foreground";
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

/** Full-detail popup for a school/campus change request with approve/reject. */
export function SchoolChangeDetailsDialog({
  request,
  fromSchoolName,
  fromCampusName,
  toSchoolName,
  toCampusName,
  isSubmitting,
  onClose,
  onApprove,
  onReject,
}: SchoolChangeDetailsDialogProps) {
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
        aria-labelledby="school-change-detail-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <p className="text-sm font-semibold text-slate-900">
            School / campus change
          </p>
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
                id="school-change-detail-title"
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
                roleBadgeClass(request.requesterRole),
              )}
            >
              {getRoleLabel(request.requesterRole as UserRole)}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(14rem,0.8fr)]">
            <dl className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <DetailRow label="Full name" value={request.fullName} />
              <DetailRow label="Username" value={request.username} />
              <DetailRow
                label="Requesting as"
                value={getRoleLabel(request.requesterRole as UserRole)}
              />
              <DetailRow label="From school" value={fromSchoolName} />
              <DetailRow label="From campus" value={fromCampusName || "—"} />
              <DetailRow label="To school" value={toSchoolName} />
              <DetailRow label="To campus" value={toCampusName || "—"} />
              <DetailRow
                label="Requested"
                value={formatDateTime(request.requestedAt)}
              />
              <DetailRow
                label="School Admin"
                value={
                  request.schoolAdminHasApproved
                    ? "Approved"
                    : "Not approved yet"
                }
              />
              <DetailRow
                label="Pending with"
                value={
                  request.approvers.length > 0
                    ? request.approvers
                        .map((a) => `${a.fullName} (${a.role})`)
                        .join(", ")
                    : "—"
                }
              />
            </dl>

            <aside className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Actions</p>
                <p className="mt-1 text-xs text-slate-500">
                  Approving records your review and applies the destination when
                  you are authorized. Reject unlocks the locked role or account.
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
