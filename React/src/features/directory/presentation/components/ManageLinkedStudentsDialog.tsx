import { useEffect, useMemo, useState } from "react";
import { Unlink } from "lucide-react";
import type { ApiError } from "@/core/api/types";
import type { DirectoryLinkedStudentSummary } from "@/features/directory/domain/directoryTypes";
import { resolvePublicUrl } from "@/features/authentication/domain/avatarUrl";
import { AccountStatusBadge } from "@/features/directory/presentation/components/AccountStatusBadge";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { Button } from "@/components/ui/button";

interface ManageLinkedStudentsDialogProps {
  parentName: string;
  linkedStudents: DirectoryLinkedStudentSummary[];
  isSubmitting: boolean;
  onClose: () => void;
  onUnlink?: (studentId: number, studentName: string) => Promise<void>;
  onAddLink?: () => void;
  /** When true, only lists students (no link/unlink). */
  readOnly?: boolean;
  /** Defaults to "Linked children". */
  title?: string;
  /** Defaults to "Students linked to {parentName}." */
  description?: string;
  /** Defaults to "No students linked yet." */
  emptyMessage?: string;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function formatClass(student: DirectoryLinkedStudentSummary): string | null {
  if (student.grade == null) {
    return student.section?.trim() || null;
  }
  const section = student.section?.trim();
  return section ? `${student.grade} - ${section}` : String(student.grade);
}

function formatPlacement(student: DirectoryLinkedStudentSummary): string {
  const parts = [
    student.schoolName?.trim() || null,
    student.campusName?.trim() || null,
    formatClass(student),
  ].filter((part): part is string => Boolean(part) && part !== "—");
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function studentMatchesQuery(
  student: DirectoryLinkedStudentSummary,
  query: string,
): boolean {
  const term = query.trim().toLowerCase();
  if (!term) {
    return true;
  }
  const haystack = [
    student.fullName,
    student.username,
    student.schoolName,
    student.campusName,
    student.section,
    student.grade != null ? String(student.grade) : null,
    student.accountStatus,
    formatClass(student),
    formatPlacement(student),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(term);
}

/** View / unlink students linked to a parent. */
export function ManageLinkedStudentsDialog({
  parentName,
  linkedStudents,
  isSubmitting,
  onClose,
  onUnlink,
  onAddLink,
  readOnly = false,
  title = "Linked children",
  description,
  emptyMessage = "No students linked yet.",
}: ManageLinkedStudentsDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const canMutate = !readOnly && onUnlink != null && onAddLink != null;

  const filteredStudents = useMemo(
    () =>
      linkedStudents.filter((student) => studentMatchesQuery(student, search)),
    [linkedStudents, search],
  );

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
    if (!onUnlink) {
      return;
    }
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

  const hasStudents = linkedStudents.length > 0;
  const searchActive = search.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {description ?? `Students linked to ${parentName}.`}
        </p>

        {hasStudents ? (
          <div className="mt-4 space-y-2">
            <AppSearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, username, grade, or section…"
              aria-label="Search students"
              autoFocus
            />
            <p className="text-xs text-slate-500">
              {searchActive
                ? `${filteredStudents.length} of ${linkedStudents.length} student${linkedStudents.length === 1 ? "" : "s"}`
                : `${linkedStudents.length} student${linkedStudents.length === 1 ? "" : "s"}`}
            </p>
          </div>
        ) : null}

        <div className="mt-3 max-h-[min(28rem,50vh)] space-y-2 overflow-y-auto pr-0.5">
          {!hasStudents ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              {emptyMessage}
            </p>
          ) : filteredStudents.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              No students match “{search.trim()}”.
            </p>
          ) : (
            filteredStudents.map((student) => {
              const imageUrl = resolvePublicUrl(student.avatarUrl);
              const initials = initialsFromName(student.fullName);
              return (
                <div
                  key={student.studentId}
                  className="relative rounded-xl border border-slate-200 px-3 py-2 pr-9"
                >
                  {canMutate ? (
                    <button
                      type="button"
                      aria-label={`Unlink ${student.fullName}`}
                      title="Unlink"
                      disabled={
                        isSubmitting || unlinkingId === student.studentId
                      }
                      onClick={() =>
                        void handleUnlink(student.studentId, student.fullName)
                      }
                      className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-md text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                    >
                      {unlinkingId === student.studentId ? (
                        <span className="text-[10px] font-semibold">…</span>
                      ) : (
                        <Unlink className="h-3.5 w-3.5" />
                      )}
                    </button>
                  ) : null}
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-brand-100 to-brand-200">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[10px] font-bold tracking-wide text-brand-800">
                          {initials}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="truncate text-sm font-medium leading-tight text-slate-900">
                          {student.fullName}
                        </p>
                        <AccountStatusBadge
                          accountStatus={student.accountStatus}
                          isActive={student.isActive ?? true}
                          size="sm"
                        />
                      </div>
                      <p className="truncate text-[11px] leading-tight text-slate-500">
                        {student.username}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] leading-tight text-slate-500">
                        {formatPlacement(student)}
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
          {canMutate ? (
            <Button type="button" onClick={onAddLink} disabled={isSubmitting}>
              Link student
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
