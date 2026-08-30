import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { ManageQuiz } from "@/features/quizzes/domain/quizTypes";
import {
  formatQuizDisplayStatusLabel,
  normalizeQuizNavigationMode,
  normalizeQuizReviewDisplayMode,
  visibleQuizInstructions,
} from "@/features/quizzes/domain/quizTypes";
import {
  getQuestionStatusTone,
  StatusBadge,
} from "@/features/questions/presentation/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function displayOrDash(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : "—";
}

function navigationModeLabel(value: string | null | undefined): string {
  switch (normalizeQuizNavigationMode(value)) {
    case "Sequential":
      return "Sequential — previous/next only";
    case "Locked":
      return "Locked — next after answering";
    default:
      return "Free — jump to any question";
  }
}

function reviewDisplayLabel(value: string | null | undefined): string {
  switch (normalizeQuizReviewDisplayMode(value)) {
    case "CorrectAnswers":
      return "Correct answers";
    case "ScoreOnly":
      return "Score only";
    case "Withheld":
      return "Withheld";
    default:
      return "Full results";
  }
}

function formatCreatedAt(value: string | undefined): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function YesNoChip({ value }: { value: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        value
          ? "border-primary/25 bg-primary/10 text-primary"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      {value ? "Yes" : "No"}
    </span>
  );
}

function SettingsTile({
  label,
  value,
  wide,
}: {
  label: string;
  value: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-muted/50 px-3.5 py-3",
        wide && "sm:col-span-2",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-semibold leading-5 text-foreground">
        {value}
      </div>
    </div>
  );
}

function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        {title}
      </h3>
      <div className="grid gap-2.5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** Read-only grid of every manage-quiz setting (create/edit form fields plus status). */
export function QuizSettingsOverview({ quiz }: { quiz: ManageQuiz }) {
  const instructionLines = visibleQuizInstructions(
    quiz.title,
    quiz.instructions,
  );
  const randomCount = quiz.randomQuestionCount ?? null;
  const createdBy =
    quiz.createdByDisplayName?.trim() || quiz.createdBy?.trim() || "—";

  return (
    <div className="space-y-5">
      <SettingsGroup title="Basics">
        <SettingsTile label="Title" value={displayOrDash(quiz.title)} wide />
        <SettingsTile
          label="Description"
          value={
            <span className="font-medium leading-6 text-muted-foreground">
              {displayOrDash(quiz.description)}
            </span>
          }
          wide
        />
        <SettingsTile
          label="Quiz type"
          value={<StatusBadge label={displayOrDash(quiz.quizType)} />}
        />
        <SettingsTile label="Class" value={displayOrDash(quiz.grade)} />
        <SettingsTile label="Subject" value={displayOrDash(quiz.subject)} />
        <SettingsTile label="Topic" value={displayOrDash(quiz.topic)} />
        <SettingsTile
          label="Difficulty"
          value={displayOrDash(quiz.difficulty)}
        />
        <SettingsTile label="School" value={displayOrDash(quiz.schoolName)} />
      </SettingsGroup>

      <SettingsGroup title="Attempt rules">
        <SettingsTile
          label="Time limit"
          value={
            quiz.timeLimitMinutes != null && quiz.timeLimitMinutes > 0
              ? `${quiz.timeLimitMinutes} min`
              : "No limit"
          }
        />
        <SettingsTile
          label="Random questions per attempt"
          value={
            randomCount != null && randomCount > 0
              ? String(randomCount)
              : "All questions"
          }
        />
        <SettingsTile
          label="Navigation mode"
          value={navigationModeLabel(quiz.navigationMode)}
        />
        <SettingsTile
          label="Shuffle questions"
          value={<YesNoChip value={quiz.shuffleQuestions} />}
        />
        <SettingsTile
          label="Shuffle options"
          value={<YesNoChip value={quiz.shuffleOptions} />}
        />
        <SettingsTile
          label="Review required"
          value={<YesNoChip value={quiz.isReviewRequired} />}
        />
        <SettingsTile
          label="Student result view"
          value={reviewDisplayLabel(quiz.reviewDisplayMode)}
        />
      </SettingsGroup>

      <SettingsGroup title="Status">
        <SettingsTile
          label="Lifecycle"
          value={
            <StatusBadge
              label={displayOrDash(formatQuizDisplayStatusLabel(quiz.lifecycleStatus))}
              tone={getQuestionStatusTone(quiz.lifecycleStatus, true)}
            />
          }
        />
        <SettingsTile
          label="Approval"
          value={
            <StatusBadge
              label={formatQuizDisplayStatusLabel(quiz.approvalStatus)}
              tone={getQuestionStatusTone(quiz.approvalStatus, true)}
            />
          }
        />
        <SettingsTile
          label="Questions"
          value={String(
            quiz.questions.length > 0
              ? quiz.questions.length
              : quiz.questionCount,
          )}
        />
        <SettingsTile label="Total marks" value={String(quiz.totalMarks)} />
        <SettingsTile label="Created by" value={createdBy} />
        <SettingsTile label="Created" value={formatCreatedAt(quiz.createdAt)} />
      </SettingsGroup>

      <section>
        <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          Instructions
        </h3>
        <div className="rounded-xl border border-border/80 bg-muted/50 px-4 py-3">
          {instructionLines.length > 0 ? (
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-foreground">
              {instructionLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </div>
      </section>
    </div>
  );
}

interface QuizSettingsDialogProps {
  open: boolean;
  quiz: ManageQuiz;
  onOpenChange: (open: boolean) => void;
}

/** Modal listing every quiz setting without allowing edits. */
export function QuizSettingsDialog({
  open,
  quiz,
  onOpenChange,
}: QuizSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-2xl border-border/80 bg-card p-0 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.12)] sm:max-w-2xl">
        <DialogHeader className="space-y-0 border-b border-border/80 bg-muted/40 px-6 py-5 pr-12 text-left">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <SlidersHorizontal className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                Quiz settings
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm leading-6 text-muted-foreground">
                Read-only view of how this quiz is configured. Published quizzes
                stay locked until an edit request is approved.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <QuizSettingsOverview quiz={quiz} />
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
