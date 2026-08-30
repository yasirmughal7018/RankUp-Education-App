import { ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/features/questions/presentation/components/StatusBadge";
import {
  getMonitorStatusTone,
  isCheckableAttemptStatus,
  studentAttemptCheckPath,
  attemptReviewActionLabel,
  hasAttemptScoreAccess,
} from "@/features/quizzes/domain/quizMonitorTypes";
import type {
  QuizAssignment,
  QuizAssignmentAttempt,
} from "@/features/quizzes/domain/quizTypes";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatAttemptWhen(attempt: QuizAssignmentAttempt): string {
  return formatDateTime(attempt.submittedAt ?? attempt.startedAt);
}

function attemptResultTone(
  status: string,
): "default" | "success" | "warning" | "danger" {
  const normalized = status.toLowerCase();
  if (normalized.includes("progress") || normalized.includes("started")) {
    return "warning";
  }
  if (
    normalized.includes("review") ||
    normalized.includes("submit") ||
    normalized.includes("complete")
  ) {
    return "success";
  }
  if (normalized.includes("expir")) {
    return "danger";
  }
  return getMonitorStatusTone(status);
}

interface AttemptRecord {
  key: string;
  assigned: string;
  attempts: string;
  attemptedDate: string;
  result: string;
  checkTo: string | null;
  canScore: boolean;
  isReviewDone: boolean;
}

function buildAttemptRecords(
  assignment: QuizAssignment,
  quizId: number,
): AttemptRecord[] {
  const assigned = assignment.assignedAt
    ? formatDateTime(assignment.assignedAt)
    : "—";
  const attempts = assignment.attempts ?? [];

  const canScore = hasAttemptScoreAccess(assignment.canScore);

  if (attempts.length === 0) {
    return [
      {
        key: "none",
        assigned,
        attempts: `0 / ${assignment.allowedAttempts}`,
        attemptedDate: "—",
        result: assignment.resultStatus || "Not Attempted",
        checkTo: null,
        canScore,
        isReviewDone: assignment.isReviewDone,
      },
    ];
  }

  return attempts.map((attempt) => ({
    key: String(attempt.attemptId || attempt.attemptNumber),
    assigned,
    attempts: `${attempt.attemptNumber} / ${assignment.allowedAttempts}`,
    attemptedDate: formatAttemptWhen(attempt),
    result: attempt.status || assignment.resultStatus,
    checkTo:
      attempt.attemptId > 0 && isCheckableAttemptStatus(attempt.status)
        ? studentAttemptCheckPath(quizId, attempt.attemptId, "assigned")
        : null,
    canScore,
    isReviewDone: assignment.isReviewDone,
  }));
}

interface QuizAssignmentAttemptsDialogProps {
  quizId: number;
  assignment: QuizAssignment | null;
  onOpenChange: (open: boolean) => void;
}

/** Nested attempt history for one assigned student. */
export function QuizAssignmentAttemptsDialog({
  quizId,
  assignment,
  onOpenChange,
}: QuizAssignmentAttemptsDialogProps) {
  const records = assignment ? buildAttemptRecords(assignment, quizId) : [];
  const studentLabel = assignment
    ? assignment.studentName?.trim() || String(assignment.studentId)
    : "";

  return (
    <Dialog open={assignment != null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-2xl border-border/80 bg-card p-0 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.12)] sm:max-w-3xl">
        <DialogHeader className="space-y-0 border-b border-border/80 bg-muted/40 px-6 py-5 pr-12 text-left">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                Attempts
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm leading-6 text-muted-foreground">
                {studentLabel
                  ? `Assigned, attempt dates, and results for ${studentLabel}.`
                  : "Assigned, attempt dates, and results."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">
                      Assigned
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">
                      Attempts
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">
                      Attempted Date
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">
                      Result
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">
                      Review
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {records.map((record) => (
                    <tr key={record.key} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">
                        {record.assigned}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {record.attempts}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {record.attemptedDate}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={record.result}
                          tone={attemptResultTone(record.result)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {record.checkTo ? (
                          <Button
                            size="sm"
                            variant={
                              record.canScore && !record.isReviewDone
                                ? "default"
                                : "outline"
                            }
                            className="h-7 rounded-full px-2.5 text-[11px] font-semibold leading-none"
                            asChild
                          >
                            <Link to={record.checkTo} onClick={() => onOpenChange(false)}>
                              {attemptReviewActionLabel(
                                record.canScore,
                                record.isReviewDone,
                              )}
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border/80 bg-muted/30 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
