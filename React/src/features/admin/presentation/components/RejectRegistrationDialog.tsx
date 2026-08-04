import { useEffect, useState } from "react";
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
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";
import { cn } from "@/lib/utils";

const MIN_REASON_LENGTH = 10;

interface RejectRegistrationDialogProps {
  registration: PendingRegistration;
  schoolName: string;
  campusName: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (
    registration: PendingRegistration,
    reason: string,
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

/** Themed confirmation dialog before rejecting a registration (reason required). */
export function RejectRegistrationDialog({
  registration,
  schoolName,
  campusName,
  isSubmitting,
  onClose,
  onConfirm,
}: RejectRegistrationDialogProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    setReason("");
  }, [registration.id]);

  const trimmedReason = reason.trim();
  const canSubmit = trimmedReason.length >= MIN_REASON_LENGTH;

  async function handleConfirm() {
    if (!canSubmit) {
      return;
    }

    try {
      await onConfirm(registration, trimmedReason);
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
          <DialogTitle>Reject registration</DialogTitle>
          <DialogDescription>
            This removes the pending request. The person can submit a new
            registration later. A rejection reason is required.
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
          <DetailRow label="School" value={schoolName} />
          <DetailRow label="Campus" value={campusName || "—"} />
        </dl>

        <div className="space-y-2">
          <label
            htmlFor="registration-reject-reason"
            className="text-sm font-medium text-foreground"
          >
            Rejection reason{" "}
            <span className="text-destructive">*</span>
          </label>
          <textarea
            id="registration-reject-reason"
            rows={4}
            value={reason}
            disabled={isSubmitting}
            onChange={(event) => setReason(event.target.value)}
            maxLength={1000}
            placeholder="Explain why this registration is being rejected (min 10 characters)…"
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
            onClick={() => void handleConfirm()}
            disabled={isSubmitting || !canSubmit}
          >
            {isSubmitting ? "Rejecting…" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
