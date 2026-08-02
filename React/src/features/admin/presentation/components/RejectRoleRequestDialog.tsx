import { useEffect, useState } from "react";
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
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";
import { cn } from "@/lib/utils";

const MIN_REASON_LENGTH = 10;

interface RejectRoleRequestDialogProps {
  request: PendingRoleRequestItem;
  schoolName: string;
  campusName: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (request: PendingRoleRequestItem, reason: string) => Promise<void>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-foreground">{value}</dd>
    </div>
  );
}

/** Themed confirmation dialog before rejecting a role request (reason required). */
export function RejectRoleRequestDialog({
  request,
  schoolName,
  campusName,
  isSubmitting,
  onClose,
  onConfirm,
}: RejectRoleRequestDialogProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    setReason("");
  }, [request.id]);

  const trimmedReason = reason.trim();
  const canSubmit = trimmedReason.length >= MIN_REASON_LENGTH;

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
          <DialogTitle>Reject role request</DialogTitle>
          <DialogDescription>
            Reject{" "}
            {getRoleLabel(request.requestedRole as UserRole)} for{" "}
            {request.fullName}. They can submit a new request later. A reason is
            required.
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
          <DetailRow label="Name" value={request.fullName} />
          <DetailRow label="Username" value={request.username} />
          <DetailRow
            label="Requested role"
            value={getRoleLabel(request.requestedRole as UserRole)}
          />
          <DetailRow label="School" value={schoolName} />
          <DetailRow label="Campus" value={campusName || "—"} />
          <DetailRow
            label="Teacher code"
            value={request.teacherCode || "—"}
          />
        </dl>

        <div className="space-y-2">
          <label
            htmlFor="role-request-reject-reason"
            className="text-sm font-medium text-foreground"
          >
            Rejection reason <span className="text-destructive">*</span>
          </label>
          <textarea
            id="role-request-reject-reason"
            rows={4}
            value={reason}
            disabled={isSubmitting}
            onChange={(event) => setReason(event.target.value)}
            maxLength={1000}
            placeholder="Explain why this role request is being rejected (min 10 characters)…"
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
            onClick={() => void onConfirm(request, trimmedReason)}
          >
            {isSubmitting ? "Rejecting…" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
