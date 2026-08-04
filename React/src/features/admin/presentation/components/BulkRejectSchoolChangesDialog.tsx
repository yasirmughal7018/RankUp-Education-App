import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BulkRejectSchoolChangesDialogProps {
  open: boolean;
  count: number;
  studentCount: number;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (leaveWithoutSchool: boolean) => void;
}

/** Bulk reject confirmation; optional clear-school for selected students. */
export function BulkRejectSchoolChangesDialog({
  open,
  count,
  studentCount,
  isSubmitting,
  onClose,
  onConfirm,
}: BulkRejectSchoolChangesDialogProps) {
  const [leaveWithoutSchool, setLeaveWithoutSchool] = useState(false);

  useEffect(() => {
    if (open) {
      setLeaveWithoutSchool(false);
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSubmitting) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reject school / campus changes</DialogTitle>
          <DialogDescription>
            Reject {count} request{count === 1 ? "" : "s"} and unlock the locked
            role or account for each. Previous school/campus stay unless you
            clear them for students.
          </DialogDescription>
        </DialogHeader>

        {studentCount > 0 ? (
          <label className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground">
            <input
              type="checkbox"
              checked={leaveWithoutSchool}
              disabled={isSubmitting}
              onChange={(event) => setLeaveWithoutSchool(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
            <span>
              For {studentCount} student request
              {studentCount === 1 ? "" : "s"}, leave{" "}
              <span className="font-medium">without a school</span>.
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
            onClick={() => onConfirm(leaveWithoutSchool)}
          >
            {isSubmitting ? "Rejecting…" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
