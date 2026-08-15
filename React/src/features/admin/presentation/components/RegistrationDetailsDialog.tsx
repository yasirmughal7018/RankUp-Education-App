import { useEffect } from "react";
import { Check, X } from "lucide-react";
import type { PendingRegistration } from "@/features/admin/domain/registrationTypes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RegistrationDetailsDialogProps {
  registration: PendingRegistration;
  schoolName: string;
  campusName: string | null;
  canApprove: boolean;
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

function formatApproverRole(role: string): string {
  switch (role) {
    case "PortalAdmin":
      return "Portal Admin";
    case "SchoolAdmin":
      return "School Admin";
    case "CampusAdmin":
      return "Campus Admin";
    default:
      return role;
  }
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date =
    value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: value.length === 10 ? undefined : "short",
  }).format(date);
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

/** Full-detail popup: user info left, eligible approvers + actions right (stacks on mobile). */
export function RegistrationDetailsDialog({
  registration,
  schoolName,
  campusName,
  canApprove,
  isSubmitting,
  onClose,
  onApprove,
  onReject,
}: RegistrationDetailsDialogProps) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isSubmitting, onClose]);

  const approvers = registration.pendingApprovers ?? [];
  const alreadyApproved = registration.currentUserHasApproved;

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
        aria-labelledby="registration-detail-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <p className="text-sm font-semibold text-slate-900">
            Registration details
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
          <div className="mb-4 flex items-center gap-3 sm:mb-5 sm:gap-3.5">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-sm font-bold tracking-wide text-brand-800 ring-2 ring-white shadow-sm sm:h-14 sm:w-14">
              {initialsFromName(registration.fullName)}
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="registration-detail-title"
                className="truncate text-[15px] font-semibold tracking-tight text-slate-900"
              >
                {registration.fullName}
              </h2>
              <p className="mt-0.5 truncate text-xs font-medium text-slate-400">
                {registration.username}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                roleBadgeClass(registration.role),
              )}
            >
              {registration.role}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.9fr)] lg:items-start">
            <dl className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <DetailRow label="Full name" value={registration.fullName} />
              <DetailRow label="Username" value={registration.username} />
              <DetailRow label="Role" value={registration.role} />
              <DetailRow
                label="Email"
                value={
                  registration.emailAddress || registration.username || "—"
                }
              />
              <DetailRow
                label="Mobile"
                value={registration.mobileNumber || "—"}
              />
              <DetailRow label="CNIC" value={registration.cnic || "—"} />
              <DetailRow label="School" value={schoolName} />
              <DetailRow label="Campus" value={campusName || "—"} />
              <DetailRow
                label="Grade"
                value={
                  registration.gradeName ||
                  (registration.grade != null
                    ? String(registration.grade)
                    : "—")
                }
              />
              <DetailRow
                label="Section"
                value={registration.section || "—"}
              />
              <DetailRow
                label="Roll / teacher code"
                value={registration.rollNumberTeacherCode || "—"}
              />
              <DetailRow
                label="Requested"
                value={formatDateTime(registration.requestedAt)}
              />
              <DetailRow
                label="Created"
                value={formatDateTime(registration.createdDate)}
              />
              <DetailRow
                label="Your approval"
                value={
                  alreadyApproved
                    ? "Approved — awaiting activation"
                    : "Not yet approved"
                }
              />
              <DetailRow
                label="Reason"
                value={registration.reasonMessage || "—"}
              />
            </dl>

            <aside className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 lg:sticky lg:top-0">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Eligible to approve
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Admins who can approve and activate this registration in
                  scope.
                </p>
              </div>

              {approvers.length === 0 ? (
                <p className="text-sm text-slate-600">—</p>
              ) : (
                <ul className="max-h-56 space-y-2 overflow-y-auto sm:max-h-72">
                  {approvers.map((approver) => (
                    <li
                      key={`${approver.userId}-${approver.role}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {approver.fullName}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {approver.username}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                        {formatApproverRole(approver.role)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-auto border-t border-slate-100 pt-3">
                {alreadyApproved ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                    You already approved this request. It is awaiting
                    activation by an authorized admin.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                    {canApprove ? (
                      <Button
                        type="button"
                        className="w-full"
                        disabled={isSubmitting}
                        onClick={onApprove}
                      >
                        <Check className="h-4 w-4" />
                        {isSubmitting ? "Approving..." : "Approve"}
                      </Button>
                    ) : null}
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
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
