import { useEffect, useState } from "react";
import type { ApiError } from "@/core/api/types";
import type { TeacherClassSection } from "@/features/directory/domain/directoryTypes";
import { Button } from "@/components/ui/button";

interface ManageTeacherClassSectionsDialogProps {
  teacherName: string;
  classSections: TeacherClassSection[];
  isSubmitting: boolean;
  onClose: () => void;
  onRemove: (grade: number, section: string) => Promise<void>;
  onAdd?: () => void;
}

function formatClassSection(item: TeacherClassSection): string {
  return `Grade ${item.grade}${item.section}`;
}

/** View and remove a teacher’s assigned class/section pairs. */
export function ManageTeacherClassSectionsDialog({
  teacherName,
  classSections,
  isSubmitting,
  onClose,
  onRemove,
  onAdd,
}: ManageTeacherClassSectionsDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isSubmitting, onClose]);

  async function handleRemove(grade: number, section: string) {
    setError(null);
    const key = `${grade}|${section}`;
    setRemovingKey(key);
    try {
      await onRemove(grade, section);
    } catch (err) {
      setError(
        (err as ApiError).message ?? "Unable to remove class and section.",
      );
    } finally {
      setRemovingKey(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">
          Classes & sections
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Classes assigned to {teacherName}.
        </p>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
          {classSections.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              No classes or sections assigned yet.
            </p>
          ) : (
            classSections.map((item) => {
              const key = `${item.grade}|${item.section}`;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5"
                >
                  <p className="truncate text-sm font-medium text-slate-900">
                    {formatClassSection(item)}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => void handleRemove(item.grade, item.section)}
                  >
                    {removingKey === key ? "Removing…" : "Remove"}
                  </Button>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          {onAdd ? (
            <Button type="button" variant="outline" onClick={onAdd}>
              Add class
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
