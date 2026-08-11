import type { PendingRoleRequestItem } from "@/features/admin/data/roleRequestApi";
import { getRoleLabel, type UserRole } from "@/core/api/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ApproveRoleRequestDialogProps {
  request: PendingRoleRequestItem;
  schoolName: string;
  campusName: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (request: PendingRoleRequestItem) => Promise<void>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-foreground">{value}</dd>
    </div>
  );
}

/** Themed confirmation dialog before approving an additional-role request. */
export function ApproveRoleRequestDialog({
  request,
  schoolName,
  campusName,
  isSubmitting,
  onClose,
  onConfirm,
}: ApproveRoleRequestDialogProps) {
  const existingRoles = request.existingRoles?.length
    ? request.existingRoles
    : [request.activeRole];

  async function handleConfirm() {
    try {
      await onConfirm(request);
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
          <DialogTitle>Approve role request</DialogTitle>
          <DialogDescription>
            Add the requested role to this account. They can switch roles from
            their profile menu after approval.
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
          <DetailRow label="Name" value={request.fullName} />
          <DetailRow label="Username" value={request.username} />
          <DetailRow
            label="Current roles"
            value={existingRoles
              .map((role) => getRoleLabel(role as UserRole))
              .join(", ")}
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
            disabled={isSubmitting}
            onClick={() => void handleConfirm()}
          >
            {isSubmitting ? "Approving…" : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
