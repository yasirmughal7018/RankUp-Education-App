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
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";
import { cn } from "@/lib/utils";

const MIN_REASON_LENGTH = 10;

interface BulkRejectRegistrationsDialogProps {
  open: boolean;
  count: number;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

/** Themed bulk reject confirmation with a required shared rejection reason. */
export function BulkRejectRegistrationsDialog({
  open,
  count,
  isSubmitting,
  onClose,
  onConfirm,
}: BulkRejectRegistrationsDialogProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
    }
  }, [open]);

  const trimmedReason = reason.trim();
  const canSubmit = trimmedReason.length >= MIN_REASON_LENGTH;

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
          <DialogTitle>Reject registrations</DialogTitle>
          <DialogDescription>
            Reject {count} registration{count === 1 ? "" : "s"}? They can submit
            a new request later. The same rejection reason will be saved for
            each selected request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label
            htmlFor="bulk-registration-reject-reason"
            className="text-sm font-medium text-foreground"
          >
            Rejection reason{" "}
            <span className="text-destructive">*</span>
          </label>
          <textarea
            id="bulk-registration-reject-reason"
            rows={4}
            value={reason}
            disabled={isSubmitting}
            onChange={(event) => setReason(event.target.value)}
            maxLength={1000}
            placeholder="Explain why these registrations are being rejected (min 10 characters)…"
            className={cn(FORM_FIELD_CLASS, "min-h-[6rem] resize-y")}
          />
          <p className="text-xs text-muted-foreground">
            {trimmedReason.length < MIN_REASON_LENGTH
              ? `${MIN_REASON_LENGTH - trimmedReason.length} more character${
                  MIN_REASON_LENGTH - trimmedReason.length === 1 ? "" : "s"
                } required`
              : `${trimmedReason.length}/1000`}
          </p>
        </div>

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
            disabled={isSubmitting || !canSubmit}
            onClick={() => onConfirm(trimmedReason)}
          >
            {isSubmitting ? "Rejecting…" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
