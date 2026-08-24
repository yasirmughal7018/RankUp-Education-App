import { AppCard } from "@/components/ui/app-card";
import {
  getQuestionStatusTone,
  StatusBadge,
} from "@/features/questions/presentation/components/StatusBadge";
import { QuizAnswerDisplay } from "@/features/quizzes/presentation/components/QuizAnswerDisplay";
import type { QuizAttemptResult } from "@/features/student/domain/studentQuizTypes";
import { resolveQuizResultDisplay } from "@/features/student/domain/quizResultDisplay";
import { cn } from "@/lib/utils";

interface QuizAttemptResultBodyProps {
  result: QuizAttemptResult;
  answerLabel?: string;
}

/** Shared student/parent result breakdown (announced questions only until review is done). */
export function QuizAttemptResultBody({
  result,
  answerLabel = "Your answer",
}: QuizAttemptResultBodyProps) {
  const display = resolveQuizResultDisplay(result);
  const scoreLabel =
    display.announcedPercent > 0 && display.announcedPercent < 100
      ? "Announced score"
      : "Score";

  return (
    <>
      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AppCard>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {scoreLabel}
          </p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-foreground">
            {display.showScore
              ? `${result.obtainedMarks}/${result.totalMarks}`
              : "—"}
          </p>
        </AppCard>
        <AppCard>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Percentage
          </p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-primary">
            {display.showScore ? `${result.percentage}%` : "—"}
          </p>
        </AppCard>
        <AppCard>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Results announced
          </p>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-foreground">
            {display.announcedPercent}%
          </p>
        </AppCard>
        <AppCard>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Status
          </p>
          <div className="mt-2">
            <StatusBadge
              label={result.resultStatus}
              tone={getQuestionStatusTone(result.resultStatus, true)}
            />
          </div>
        </AppCard>
      </section>

      {display.modeNote ? (
        <div
          className={cn(
            "mb-6 rounded-xl border px-4 py-3 text-sm",
            display.reviewPending
              ? "border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]"
              : "border-border bg-muted/70 text-muted-foreground",
          )}
        >
          {display.modeNote}
        </div>
      ) : null}

      <div className="space-y-4">
        {result.questions.map((question, index) => {
          const pending =
            question.resultPending === true ||
            (!display.showScore && display.reviewPending);

          return (
            <AppCard key={question.id}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-display text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <h2 className="font-display text-sm font-semibold leading-6 text-foreground sm:text-base">
                    {question.text}
                  </h2>
                </div>
                {pending ? (
                  <span className="shrink-0 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    Pending
                  </span>
                ) : display.showCorrectness ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold",
                      question.isCorrect
                        ? "border-[var(--status-approved-border)] bg-[var(--status-approved-bg)] text-[var(--status-approved-text)]"
                        : "border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)] text-[var(--status-rejected-text)]",
                    )}
                  >
                    {question.awardedMarks}/{question.marks}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    {question.awardedMarks}/{question.marks}
                  </span>
                )}
              </div>

              <QuizAnswerDisplay
                question={{
                  questionType: question.questionType ?? "Single Choice",
                  selectedOptionId: question.selectedOptionId,
                  selectedOptionIds: question.selectedOptionIds,
                  submittedText: question.submittedText,
                  options: question.options?.map((option) => ({
                    id: option.id,
                    text: option.text,
                    imageUrl: option.imageUrl,
                    isCorrect: option.isCorrect,
                  })),
                }}
                answerLabel={answerLabel}
                showCorrectAnswers={!pending && display.showCorrectAnswers}
                selectedMatchLabel="Your match"
                yourOrderLabel={answerLabel}
                className="mt-1"
              />

              {!pending && display.showExplanations && question.explanation ? (
                <p className="mt-3 rounded-xl border border-border/80 bg-muted/50 px-3 py-2 text-sm leading-6 text-muted-foreground">
                  {question.explanation}
                </p>
              ) : null}
            </AppCard>
          );
        })}
      </div>
    </>
  );
}
