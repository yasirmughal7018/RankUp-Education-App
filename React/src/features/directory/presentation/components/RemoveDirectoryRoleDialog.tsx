import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DirectoryCombinableRole } from "@/features/directory/presentation/utils/directoryRoles";

interface RemoveDirectoryRoleDialogProps {
  open: boolean;
  personName: string;
  role: DirectoryCombinableRole | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Themed confirm dialog for removing a companion role from a multi-role account. */
export function RemoveDirectoryRoleDialog({
  open,
  personName,
  role,
  isSubmitting,
  onClose,
  onConfirm,
}: RemoveDirectoryRoleDialogProps) {
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
          <DialogTitle>
            {role ? `Remove ${role} role` : "Remove role"}
          </DialogTitle>
          <DialogDescription>
            {role
              ? `Remove the ${role} role from ${personName}? Their other roles stay on this account. The only remaining role cannot be removed.`
              : ""}
          </DialogDescription>
        </DialogHeader>
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
            onClick={onConfirm}
            disabled={isSubmitting || role == null}
          >
            {isSubmitting
              ? "Removing…"
              : role
                ? `Remove ${role}`
                : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
