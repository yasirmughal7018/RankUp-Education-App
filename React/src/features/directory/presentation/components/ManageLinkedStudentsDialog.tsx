import { useEffect, useState } from "react";
import type { ApiError } from "@/core/api/types";
import type { DirectoryLinkedStudentSummary } from "@/features/directory/domain/directoryTypes";
import { Button } from "@/components/ui/button";

interface ManageLinkedStudentsDialogProps {
  parentName: string;
  linkedStudents: DirectoryLinkedStudentSummary[];
  isSubmitting: boolean;
  onClose: () => void;
  onUnlink: (studentId: number, studentName: string) => Promise<void>;
  onAddLink: () => void;
}

/** View / unlink children linked to a parent. */
export function ManageLinkedStudentsDialog({
  parentName,
  linkedStudents,
  isSubmitting,
  onClose,
  onUnlink,
  onAddLink,
}: ManageLinkedStudentsDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<number | null>(null);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isSubmitting, onClose]);

  async function handleUnlink(studentId: number, fullName: string) {
    setError(null);
    setUnlinkingId(studentId);
    try {
      await onUnlink(studentId, fullName);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message ?? "Unable to unlink student.");
    } finally {
      setUnlinkingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">
          Linked children
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Students linked to {parentName}.
        </p>

        <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
          {linkedStudents.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              No children linked yet.
            </p>
          ) : (
            linkedStudents.map((student) => (
              <div
                key={student.studentId}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {student.fullName}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {student.username}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 text-destructive hover:bg-destructive/10"
                  disabled={isSubmitting || unlinkingId === student.studentId}
                  onClick={() =>
                    void handleUnlink(student.studentId, student.fullName)
                  }
                >
                  {unlinkingId === student.studentId ? "…" : "Unlink"}
                </Button>
              </div>
            ))
          )}
        </div>

        {error ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Close
          </Button>
          <Button type="button" onClick={onAddLink} disabled={isSubmitting}>
            Link student
          </Button>
        </div>
      </div>
    </div>
  );
}
