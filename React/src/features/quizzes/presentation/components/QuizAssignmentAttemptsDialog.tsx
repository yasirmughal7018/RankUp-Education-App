import { ClipboardList } from "lucide-react";
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
import { getMonitorStatusTone } from "@/features/quizzes/domain/quizMonitorTypes";
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
}

function buildAttemptRecords(assignment: QuizAssignment): AttemptRecord[] {
  const assigned = assignment.assignedAt
    ? formatDateTime(assignment.assignedAt)
    : "—";
  const attempts = assignment.attempts ?? [];

  if (attempts.length === 0) {
    return [
      {
        key: "none",
        assigned,
        attempts: `0 / ${assignment.allowedAttempts}`,
        attemptedDate: "—",
        result: assignment.resultStatus || "Not Attempted",
      },
    ];
  }

  return attempts.map((attempt) => ({
    key: String(attempt.attemptNumber),
    assigned,
    attempts: `${attempt.attemptNumber} / ${assignment.allowedAttempts}`,
    attemptedDate: formatAttemptWhen(attempt),
    result: attempt.status || assignment.resultStatus,
  }));
}

interface QuizAssignmentAttemptsDialogProps {
  assignment: QuizAssignment | null;
  onOpenChange: (open: boolean) => void;
}

/** Nested attempt history for one assigned student. */
export function QuizAssignmentAttemptsDialog({
  assignment,
  onOpenChange,
}: QuizAssignmentAttemptsDialogProps) {
  const records = assignment ? buildAttemptRecords(assignment) : [];
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
