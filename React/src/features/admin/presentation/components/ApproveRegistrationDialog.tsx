import { useEffect } from "react";
import type { PendingRegistration } from "@/features/admin/domain/registrationTypes";

interface ApproveRegistrationDialogProps {
  registration: PendingRegistration;
  schoolName: string;
  campusName: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (registration: PendingRegistration) => Promise<void>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <dt className="font-medium text-slate-600">{label}</dt>
      <dd className="col-span-2 text-slate-900">{value}</dd>
    </div>
  );
}

export function ApproveRegistrationDialog({
  registration,
  schoolName,
  campusName,
  isSubmitting,
  onClose,
  onConfirm,
}: ApproveRegistrationDialogProps) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isSubmitting, onClose]);

  async function handleConfirm() {
    try {
      await onConfirm(registration);
    } catch {
      // Parent surfaces API errors.
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="approve-registration-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="mb-6">
          <h2
            id="approve-registration-title"
            className="text-xl font-semibold text-slate-900"
          >
            Approve registration
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Review the request details. Approving does not change any fields or
            set a password. The user must set their own password on first login.
          </p>
        </div>

        <dl className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <DetailRow label="Name" value={registration.fullName} />
          <DetailRow label="Username" value={registration.username} />
          <DetailRow label="Role" value={registration.role} />
          <DetailRow
            label="Mobile"
            value={registration.mobileNumber ?? registration.username}
          />
          <DetailRow label="CNIC" value={registration.cnic || "—"} />
          <DetailRow label="Email" value={registration.emailAddress || "—"} />
          <DetailRow label="School" value={schoolName} />
          <DetailRow label="Campus" value={campusName || "—"} />
          <DetailRow
            label="Pending with"
            value={
              (registration.pendingApprovers ?? [])
                .map(
                  (approver) =>
                    `${approver.fullName} (${
                      approver.role === "PortalAdmin"
                        ? "Portal Admin"
                        : approver.role === "SchoolAdmin"
                          ? "School Admin"
                          : approver.role === "CampusAdmin"
                            ? "Campus Admin"
                            : approver.role
                    })`,
                )
                .join(", ") || "—"
            }
          />
          <DetailRow
            label="Roll / teacher code"
            value={registration.rollNumberTeacherCode || "—"}
          />
          <DetailRow
            label="Reason"
            value={registration.reasonMessage || "—"}
          />
        </dl>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isSubmitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Approving..." : "Approve account"}
          </button>
        </div>
      </div>
    </div>
  );
}
