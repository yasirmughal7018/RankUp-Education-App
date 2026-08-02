import type { PendingRegistration } from "@/features/admin/domain/registrationTypes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-foreground">{value}</dd>
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

/** Themed confirmation dialog before approving a registration. */
export function ApproveRegistrationDialog({
  registration,
  schoolName,
  campusName,
  isSubmitting,
  onClose,
  onConfirm,
}: ApproveRegistrationDialogProps) {
  async function handleConfirm() {
    try {
      await onConfirm(registration);
    } catch {
      // Parent surfaces API errors.
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Approve registration</DialogTitle>
          <DialogDescription>
            Review the request details. Approving does not change any fields or
            set a password. The user must set their own password on first login.
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
          <DetailRow label="Name" value={registration.fullName} />
          <DetailRow label="Username" value={registration.username} />
          <DetailRow label="Role" value={registration.role} />
          <DetailRow
            label="Email"
            value={registration.emailAddress || registration.username || "—"}
          />
          <DetailRow label="Mobile" value={registration.mobileNumber || "—"} />
          <DetailRow label="CNIC" value={registration.cnic || "—"} />
          <DetailRow label="School" value={schoolName} />
          <DetailRow label="Campus" value={campusName || "—"} />
          <DetailRow
            label="Pending with"
            value={
              (registration.pendingApprovers ?? [])
                .map(
                  (approver) =>
                    `${approver.fullName} (${formatApproverRole(approver.role)})`,
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

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Approving…" : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
