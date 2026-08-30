import { Award, Percent, Megaphone, MessageSquare, UserCheck, Hash } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppCard } from "@/components/ui/app-card";
import { AppSectionHeader } from "@/components/ui/app-section-header";
import { AppStatCard } from "@/components/ui/app-stat-card";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import { Progress } from "@/components/ui/progress";
import { QuizAnswerDisplay } from "@/features/quizzes/presentation/components/QuizAnswerDisplay";
import { QuizOtherAttemptsControl } from "@/features/student/presentation/components/QuizOtherAttemptsDialog";
import type { QuizAttemptResult } from "@/features/student/domain/studentQuizTypes";
import { resolveQuizResultDisplay } from "@/features/student/domain/quizResultDisplay";
import { formatMonitorStatus } from "@/features/quizzes/domain/quizMonitorTypes";

interface QuizAttemptResultBodyProps {
  result: QuizAttemptResult;
  answerLabel?: string;
  attemptResultTo?: (attemptId: number) => string;
}

function ReviewNote({
  title,
  body,
  icon: Icon,
  className,
}: {
  title: string;
  body: string;
  icon: LucideIcon;
  className: string;
}) {
  const text = body.trim();
  if (!text) {
    return null;
  }

  return (
    <div className={`mt-3 rounded-xl border px-4 py-3 text-sm leading-6 ${className}`}>
      <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {title}
      </p>
      <p className="whitespace-pre-wrap text-foreground">{text}</p>
    </div>
  );
}

function QuestionReviewNotes({
  teacherFeedback,
  checkerFeedback,
  hideUntilAnnounced,
}: {
  teacherFeedback?: string | null;
  checkerFeedback?: string | null;
  hideUntilAnnounced: boolean;
}) {
  if (hideUntilAnnounced) {
    return null;
  }

  const teacher = teacherFeedback?.trim() ?? "";
  const checker = checkerFeedback?.trim() ?? "";
  if (!teacher && !checker) {
    return null;
  }

  return (
    <div className="mt-1">
      <ReviewNote
        title="Teacher feedback"
        body={teacher}
        icon={MessageSquare}
        className="border-primary/20 bg-primary/5"
      />
      <ReviewNote
        title="Checker feedback"
        body={checker}
        icon={UserCheck}
        className="border-[hsl(var(--achievement))]/25 bg-[hsl(var(--achievement-light))]"
      />
    </div>
  );
}

/** Shared student/parent result breakdown (announced questions only until review is done). */
export function QuizAttemptResultBody({
  result,
  answerLabel = "Your answer",
  attemptResultTo,
}: QuizAttemptResultBodyProps) {
  const display = resolveQuizResultDisplay(result);
  const submittedCount = result.attempts?.length ?? 0;
  const scoreLabel =
    display.announcedPercent > 0 && display.announcedPercent < 100
      ? "Announced score"
      : "Score";

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AppStatCard
          compact
          className="h-full"
          title="Attempt"
          value={`#${result.attemptNumber}`}
          icon={Hash}
          colorVariant="primary"
          description={
            submittedCount > 0
              ? `${result.attemptNumber} of ${submittedCount} submitted`
              : "Submitted result"
          }
          action={
            attemptResultTo ? (
              <QuizOtherAttemptsControl
                attempts={result.attempts}
                currentAttemptId={result.attemptId}
                showScore={display.showScore}
                attemptResultTo={attemptResultTo}
              />
            ) : null
          }
        />
        <AppStatCard
          compact
          className="h-full"
          title={scoreLabel}
          value={
            display.showScore
              ? `${result.obtainedMarks}/${result.totalMarks}`
              : "—"
          }
          icon={Award}
          colorVariant="success"
          description={
            display.showScore
              ? "Marks from announced questions"
              : "Hidden until results are announced"
          }
        />
        <AppStatCard
          compact
          className="h-full"
          title="Percentage"
          value={display.showScore ? `${result.percentage}%` : "—"}
          icon={Percent}
          colorVariant="achievement"
          description={
            display.showScore
              ? "Of total quiz marks"
              : "Available after announcement"
          }
        />
        <AppStatCard
          compact
          className="h-full"
          title="Results announced"
          value={`${display.announcedPercent}%`}
          icon={Megaphone}
          colorVariant={display.announcedPercent >= 100 ? "success" : "warning"}
          description={
            display.announcedPercent >= 100
              ? "All question results are visible"
              : "Share of marks that have been released"
          }
        />
      </section>

      <AppCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground sm:text-sm">
              Status
            </p>
            <div className="mt-2">
              <AppStatusBadge
                status={result.resultStatus}
                label={formatMonitorStatus(result.resultStatus)}
              />
            </div>
          </div>
          <div className="min-w-0 flex-1 sm:max-w-md">
            <p className="mb-2 text-xs font-medium text-muted-foreground sm:text-sm">
              Announcement progress
            </p>
            <Progress value={display.announcedPercent} className="h-3" />
            <p className="mt-2 text-sm text-muted-foreground">
              {display.announcedPercent}% results announced
            </p>
          </div>
        </div>
      </AppCard>

      {display.modeNote ? (
        <AppCard className="border-primary/20 bg-primary/5">
          <p className="text-sm font-semibold text-foreground">
            {display.announcedPercent <= 0
              ? "Results pending"
              : "Partial results"}
          </p>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            {display.modeNote}
          </p>
        </AppCard>
      ) : null}

      <section>
        <AppSectionHeader
          title="Question review"
          description={
            display.reviewPending
              ? "Announced questions show marks and answers. The rest stay pending."
              : "Your answers, marks, and explanations for this attempt."
          }
        />

        <div className="space-y-4">
          {result.questions.map((question, index) => {
            const pending =
              question.resultPending === true ||
              (!display.showScore && display.reviewPending);

            return (
              <AppCard key={question.id} animate>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-display text-sm font-semibold text-primary">
                      {index + 1}
                    </span>
                    <h2 className="font-display text-base font-semibold leading-6 tracking-tight text-foreground sm:text-lg">
                      {question.text}
                    </h2>
                  </div>
                  {pending ? (
                    <AppStatusBadge status="pending" label="Pending" />
                  ) : (
                    <AppStatusBadge
                      status={question.isCorrect ? "approved" : "rejected"}
                      label={`${question.awardedMarks}/${question.marks}`}
                    />
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
                />

                {!pending && display.showExplanations && question.explanation ? (
                  <p className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-6 text-foreground">
                    <span className="font-semibold text-primary">Explanation: </span>
                    {question.explanation}
                  </p>
                ) : null}

                <QuestionReviewNotes
                  teacherFeedback={question.teacherFeedback}
                  checkerFeedback={question.parentFeedback}
                  hideUntilAnnounced={pending && !display.showExplanations}
                />
              </AppCard>
            );
          })}
        </div>
      </section>
    </>
  );
}
