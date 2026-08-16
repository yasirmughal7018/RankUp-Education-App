import { useEffect, useState } from "react";
import { Unlink } from "lucide-react";
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
  /** Optional label formatter (e.g. coordinator full-class display). */
  formatItem?: (item: TeacherClassSection) => string;
  title?: string;
  description?: string;
}

function defaultFormatClassSection(item: TeacherClassSection): string {
  const section = item.section?.trim();
  return section ? `Grade ${item.grade} - ${section}` : `Grade ${item.grade}`;
}

/** View and remove assigned class/section pairs (matches linked-children popup layout). */
export function ManageTeacherClassSectionsDialog({
  teacherName,
  classSections,
  isSubmitting,
  onClose,
  onRemove,
  onAdd,
  formatItem = defaultFormatClassSection,
  title = "Classes & sections",
  description,
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
    const key = `${grade}|${section || "*"}`;
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
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {description ?? `Classes assigned to ${teacherName}.`}
        </p>

        <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
          {classSections.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              No classes or sections assigned yet.
            </p>
          ) : (
            classSections.map((item) => {
              const key = `${item.grade}|${item.section || "*"}`;
              return (
                <div
                  key={key}
                  className="relative rounded-xl border border-slate-200 px-3 py-2 pr-9"
                >
                  <button
                    type="button"
                    aria-label={`Remove ${formatItem(item)}`}
                    title="Remove"
                    disabled={isSubmitting || removingKey === key}
                    onClick={() => void handleRemove(item.grade, item.section)}
                    className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-md text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                  >
                    {removingKey === key ? (
                      <span className="text-[10px] font-semibold">…</span>
                    ) : (
                      <Unlink className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-xs font-bold tabular-nums text-brand-800">
                      {item.grade}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight text-slate-900">
                        {formatItem(item)}
                      </p>
                      <p className="truncate text-[11px] leading-tight text-slate-500">
                        Assigned class
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
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
          {onAdd ? (
            <Button type="button" onClick={onAdd} disabled={isSubmitting}>
              Add class
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
