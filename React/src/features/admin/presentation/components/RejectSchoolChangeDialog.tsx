import { useEffect, useState } from "react";
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

interface RejectSchoolChangeDialogProps {
  request: PendingSchoolChangeItem;
  fromSchoolName: string;
  fromCampusName: string | null;
  toSchoolName: string;
  toCampusName: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (
    request: PendingSchoolChangeItem,
    leaveWithoutSchool: boolean,
  ) => Promise<void>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-foreground">{value}</dd>
    </div>
  );
}

/** Themed reject confirmation; students may leave without a school. */
export function RejectSchoolChangeDialog({
  request,
  fromSchoolName,
  fromCampusName,
  toSchoolName,
  toCampusName,
  isSubmitting,
  onClose,
  onConfirm,
}: RejectSchoolChangeDialogProps) {
  const [leaveWithoutSchool, setLeaveWithoutSchool] = useState(false);
  const isStudent = request.requesterRole === "Student";

  useEffect(() => {
    setLeaveWithoutSchool(false);
  }, [request.id]);

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
          <DialogTitle>Reject school / campus change</DialogTitle>
          <DialogDescription>
            Reject this move and unlock the locked role or account. Previous
            school/campus stay unless you clear them for a student.
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

        {isStudent ? (
          <label className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground">
            <input
              type="checkbox"
              checked={leaveWithoutSchool}
              disabled={isSubmitting}
              onChange={(event) => setLeaveWithoutSchool(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
            <span>
              Leave student <span className="font-medium">without a school</span>{" "}
              (clears school and campus).
            </span>
          </label>
        ) : null}

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
            variant="destructive"
            disabled={isSubmitting}
            onClick={() => void onConfirm(request, leaveWithoutSchool)}
          >
            {isSubmitting ? "Rejecting…" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
