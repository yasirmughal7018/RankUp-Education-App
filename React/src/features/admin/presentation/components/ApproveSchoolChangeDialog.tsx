import type { PendingSchoolChangeItem } from "@/features/admin/data/schoolChangeApi";
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

interface ApproveSchoolChangeDialogProps {
  request: PendingSchoolChangeItem;
  fromSchoolName: string;
  fromCampusName: string | null;
  toSchoolName: string;
  toCampusName: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (request: PendingSchoolChangeItem) => Promise<void>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-foreground">{value}</dd>
    </div>
  );
}

/** Themed confirmation before approving a school/campus change. */
export function ApproveSchoolChangeDialog({
  request,
  fromSchoolName,
  fromCampusName,
  toSchoolName,
  toCampusName,
  isSubmitting,
  onClose,
  onConfirm,
}: ApproveSchoolChangeDialogProps) {
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
          <DialogTitle>Approve school / campus change</DialogTitle>
          <DialogDescription>
            Record your approval. If you can apply the destination change, the
            move is applied and the locked role or account is unlocked.
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
          <DetailRow label="Name" value={request.fullName} />
          <DetailRow label="Username" value={request.username} />
          <DetailRow
            label="Requesting as"
            value={getRoleLabel(request.requesterRole as UserRole)}
          />
          <DetailRow
            label="From"
            value={`${fromSchoolName}${fromCampusName ? ` · ${fromCampusName}` : ""}`}
          />
          <DetailRow
            label="To"
            value={`${toSchoolName}${toCampusName ? ` · ${toCampusName}` : ""}`}
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
