import { useState } from "react";
import { Link } from "react-router-dom";
import { History } from "lucide-react";
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
import type { QuizAttemptSummary } from "@/features/student/domain/studentQuizTypes";
import { canSwitchOtherQuizAttempts } from "@/features/student/domain/studentQuizTypes";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

interface QuizOtherAttemptsControlProps {
  attempts: readonly QuizAttemptSummary[] | null | undefined;
  currentAttemptId: number;
  showScore: boolean;
  attemptResultTo: (attemptId: number) => string;
}

/** Compact history control on the attempt tile when more than two results exist. */
export function QuizOtherAttemptsControl({
  attempts,
  currentAttemptId,
  showScore,
  attemptResultTo,
}: QuizOtherAttemptsControlProps) {
  const [open, setOpen] = useState(false);
  const rows = attempts ?? [];

  if (!canSwitchOtherQuizAttempts(rows)) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        aria-label="View other attempts"
        title="Other attempts"
        className="h-7 w-7 shrink-0 rounded-full p-0"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <History className="h-3.5 w-3.5" aria-hidden />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-2xl border-border/80 bg-card p-0 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.12)] sm:max-w-lg">
          <DialogHeader className="space-y-0 border-b border-border/80 bg-muted/40 px-6 py-5 pr-12 text-left">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <History className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                  Other attempts
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  Open a previous submitted result for this quiz.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
            <ul className="space-y-2">
              {rows.map((attempt) => {
                const viewing = attempt.attemptId === currentAttemptId;
                const content = (
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        Attempt #{attempt.attemptNumber}
                        {viewing ? (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            Viewing
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDateTime(attempt.submittedAt)}
                        {showScore ? ` · ${attempt.percentage}%` : ""}
                      </p>
                    </div>
                    <StatusBadge
                      label={attempt.status}
                      tone={getMonitorStatusTone(attempt.status)}
                    />
                  </div>
                );

                if (viewing) {
                  return (
                    <li
                      key={attempt.attemptId}
                      className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3"
                    >
                      {content}
                    </li>
                  );
                }

                return (
                  <li key={attempt.attemptId}>
                    <Link
                      to={attemptResultTo(attempt.attemptId)}
                      onClick={() => setOpen(false)}
                      className="block rounded-xl border border-border/80 bg-card px-4 py-3 transition hover:border-primary/30 hover:bg-muted/50"
                    >
                      {content}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <DialogFooter className="border-t border-border/80 bg-muted/30 px-6 py-4 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
