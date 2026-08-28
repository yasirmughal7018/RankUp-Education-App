import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { AppCard } from "@/components/ui/app-card";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { AppStatusBadge } from "@/components/ui/app-status-badge";
import { Button } from "@/components/ui/button";
import type { MarkAttemptAnswerInput } from "@/features/quizzes/domain/quizMonitorTypes";
import { formatIntegrityCounters } from "@/features/quizzes/domain/quizMonitorTypes";
import {
  useAttemptReviewQuery,
  useFinalizeAttemptReviewMutation,
  useMarkAttemptAnswersMutation,
} from "@/features/quizzes/presentation/hooks/useQuizQueries";
import {
  getQuestionStatusTone,
  StatusBadge,
} from "@/features/questions/presentation/components/StatusBadge";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";
import { cn } from "@/lib/utils";
import { AttemptReviewAnswerDisplay } from "@/features/quizzes/presentation/components/AttemptReviewAnswerDisplay";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import {
  attemptReviewScoreHint,
  canScoreQuizAssignment,
  hasAttemptScoreAccess,
} from "@/features/quizzes/domain/quizMonitorTypes";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function reviewBackTarget(
  quizId: number,
  from: string | null,
): { to: string; label: string } {
  switch (from) {
    case "monitoring":
      return {
        to: `/quizzes/${quizId}/monitoring`,
        label: "Back to monitoring",
      };
    case "assigned":
      return {
        to: `/quizzes/${quizId}/assigned`,
        label: "Back to assigned students",
      };
    case "board":
      return { to: "/quizzes/assignments", label: "Back to assignments" };
    default:
      return {
        to: "/quizzes/reviews/pending",
        label: "Back to pending reviews",
      };
  }
}

function ReviewMarksChip({
  id,
  awarded,
  maxMarks,
  disabled,
  readOnly,
  onChange,
}: {
  id: string;
  awarded: number;
  maxMarks: number;
  disabled: boolean;
  readOnly: boolean;
  onChange: (value: number) => void;
}) {
  const full = maxMarks > 0 && awarded >= maxMarks;
  const empty = awarded <= 0;
  const awardedClass = full
    ? "text-[hsl(var(--success))]"
    : empty
      ? "text-muted-foreground"
      : "text-primary";

  return (
    <div
      className={cn(
        "inline-flex min-w-[6.75rem] shrink-0 flex-col items-end rounded-2xl border px-3 py-2 shadow-sm",
        full
          ? "border-[hsl(var(--success))]/30 bg-[hsl(var(--success-light))]"
          : empty
            ? "border-border/80 bg-muted/60"
            : "border-primary/25 bg-primary/5",
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Marks
      </span>
      <div className="mt-0.5 flex items-baseline gap-1">
        {readOnly ? (
          <span
            className={cn(
              "font-display text-xl font-semibold tabular-nums tracking-tight",
              awardedClass,
            )}
          >
            {awarded}
          </span>
        ) : (
          <input
            id={id}
            type="number"
            min={0}
            max={maxMarks}
            value={awarded}
            disabled={disabled}
            onChange={(event) => onChange(Number(event.target.value))}
            aria-label={`Awarded marks out of ${maxMarks}`}
            className={cn(
              "h-8 w-11 bg-transparent p-0 text-right font-display text-xl font-semibold tabular-nums tracking-tight outline-none",
              "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
              awardedClass,
              "focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-80",
            )}
          />
        )}
        <span className="text-sm font-medium tabular-nums text-muted-foreground">
          / {maxMarks}
        </span>
      </div>
    </div>
  );
}

/** Manual grading page: mark answers and finalize attempt review. */
export function AttemptReviewPage() {
  const { quizId, attemptId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const numericQuizId = Number(quizId);
  const numericAttemptId = Number(attemptId);
  const back = reviewBackTarget(numericQuizId, searchParams.get("from"));

  const { data: review, isLoading, error } = useAttemptReviewQuery(
    numericQuizId,
    numericAttemptId,
  );
  const markAnswers = useMarkAttemptAnswersMutation(
    numericQuizId,
    numericAttemptId,
  );
  const finalizeReview = useFinalizeAttemptReviewMutation(
    numericQuizId,
    numericAttemptId,
  );

  const [marks, setMarks] = useState<Record<number, number>>({});
  const [feedback, setFeedback] = useState<Record<number, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [finalizeOpen, setFinalizeOpen] = useState(false);

  useEffect(() => {
    if (!review) {
      return;
    }

    setMarks(
      Object.fromEntries(
        review.questions.map((question) => [
          question.questionId,
          question.awardedMarks,
        ]),
      ),
    );
    setFeedback(
      Object.fromEntries(
        review.questions.map((question) => [
          question.questionId,
          question.parentFeedback ?? "",
        ]),
      ),
    );
  }, [review]);

  function buildAnswers(): MarkAttemptAnswerInput[] {
    if (!review) {
      return [];
    }

    return review.questions.map((question) => ({
      questionId: question.questionId,
      awardedMarks: marks[question.questionId] ?? question.awardedMarks,
      feedback: feedback[question.questionId]?.trim() || null,
    }));
  }

  const isSubmitting = markAnswers.isPending || finalizeReview.isPending;

  async function handleSaveMarks() {
    if (!review) {
      return;
    }

    setActionError(null);
    setSuccessMessage(null);

    try {
      await markAnswers.mutateAsync(buildAnswers());
      setSuccessMessage(review.isReviewDone ? "Marks updated." : "Marks saved.");
    } catch (caught) {
      const apiError = caught as { message?: string };
      setActionError(apiError.message || "Unable to save marks.");
    }
  }

  async function handleFinalize() {
    if (!review) {
      return;
    }

    setActionError(null);
    setSuccessMessage(null);

    try {
      await markAnswers.mutateAsync(buildAnswers());
      await finalizeReview.mutateAsync();
      setFinalizeOpen(false);
      navigate(back.to);
    } catch (caught) {
      setFinalizeOpen(false);
      const apiError = caught as { message?: string };
      setActionError(apiError.message || "Unable to finalize review.");
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-muted-foreground sm:px-6">
        Loading attempt review...
      </div>
    );
  }

  if (!review) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <PageHeader
          title="Review not found"
          description={error?.message ?? "Unable to load attempt review."}
          backTo={back.to}
          backAriaLabel={back.label}
        />
      </div>
    );
  }

  const integrity = formatIntegrityCounters(
    review.focusLossCount,
    review.clipboardPasteCount,
  );
  const obtainedMarks = review.questions.reduce((sum, question) => {
    const raw = marks[question.questionId] ?? question.awardedMarks;
    const awarded = Number.isFinite(raw) ? raw : 0;
    return sum + Math.min(Math.max(awarded, 0), question.maxMarks);
  }, 0);
  const percentage =
    review.totalMarks > 0
      ? Math.round((obtainedMarks * 100) / review.totalMarks)
      : 0;
  const canScore =
    hasAttemptScoreAccess(review.canScore) &&
    (!review.assignedByRole ||
      canScoreQuizAssignment(user?.role, review.assignedByRole));
  const scoringDisabled = !canScore || isSubmitting;
  const scoreHint = attemptReviewScoreHint(canScore, review.assignedByRole);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        title={`Review attempt #${review.attemptNumber}`}
        description={`${review.quizTitle} · ${review.studentName?.trim() || `Student ${review.studentId}`}`}
        backTo={back.to}
        backAriaLabel={back.label}
        action={
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <div className="flex flex-wrap justify-end gap-1.5">
              <StatusBadge
                label={review.status}
                tone={getQuestionStatusTone(review.status, !review.isReviewDone)}
              />
              {review.isReviewDone ? (
                <StatusBadge label="Finalized" tone="success" />
              ) : null}
            </div>
            <div className="inline-flex items-center gap-3 rounded-2xl border border-border/80 bg-card px-4 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Score
                </p>
                <p className="font-display text-lg font-semibold tabular-nums leading-tight text-foreground">
                  {obtainedMarks}
                  <span className="text-muted-foreground">/{review.totalMarks}</span>
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-primary">
                {percentage}%
              </span>
            </div>
          </div>
        }
      />

      {successMessage ? (
        <div className="mb-4 rounded-xl border border-[hsl(var(--success))]/25 bg-[hsl(var(--success-light))] px-4 py-3 text-sm text-foreground">
          {successMessage}
        </div>
      ) : null}

      {actionError ? (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      ) : null}

      {scoreHint ? (
        <div className="mb-4 rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {scoreHint}
        </div>
      ) : null}

      <AppCard className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Submitted {formatDateTime(review.submittedAt)}
          </p>
          {integrity ? (
            <StatusBadge
              label={integrity}
              tone={
                (review.focusLossCount ?? 0) > 2 ||
                (review.clipboardPasteCount ?? 0) > 0
                  ? "warning"
                  : "default"
              }
            />
          ) : null}
        </div>
      </AppCard>

      <div className="space-y-4">
        {review.questions.map((question, index) => (
          <AppCard key={question.questionId} animate>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-display text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold leading-6 tracking-tight text-foreground sm:text-lg">
                    {question.questionText}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {question.questionType}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <div className="flex flex-wrap justify-end gap-1.5">
                  {question.requiresReview ? (
                    <AppStatusBadge status="pending" label="Needs review" />
                  ) : null}
                  {question.isCorrect ? (
                    <AppStatusBadge status="approved" label="Auto-correct" />
                  ) : null}
                </div>
                <ReviewMarksChip
                  id={`review-marks-${question.questionId}`}
                  awarded={marks[question.questionId] ?? 0}
                  maxMarks={question.maxMarks}
                  disabled={scoringDisabled}
                  readOnly={!canScore}
                  onChange={(value) =>
                    setMarks((current) => ({
                      ...current,
                      [question.questionId]: value,
                    }))
                  }
                />
              </div>
            </div>

            <AttemptReviewAnswerDisplay question={question} />

            {question.aiFeedback?.trim() ? (
              <div className="mb-3 rounded-xl border border-[hsl(var(--ai))]/25 bg-[hsl(var(--ai-light))] px-4 py-3 text-sm text-foreground">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--ai))]">
                    AI suggestion
                  </p>
                  {canScore ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSubmitting}
                      className="h-7 rounded-full px-2.5 text-[11px]"
                      onClick={() =>
                        setFeedback((current) => ({
                          ...current,
                          [question.questionId]: question.aiFeedback!.trim(),
                        }))
                      }
                    >
                      Use as feedback
                    </Button>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap">{question.aiFeedback}</p>
                {canScore ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Suggestion only — confirm marks and feedback before finalizing.
                  </p>
                ) : null}
              </div>
            ) : null}

            {canScore ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Feedback
                </label>
                <input
                  type="text"
                  value={feedback[question.questionId] ?? ""}
                  disabled={scoringDisabled}
                  onChange={(event) =>
                    setFeedback((current) => ({
                      ...current,
                      [question.questionId]: event.target.value,
                    }))
                  }
                  className={FORM_FIELD_CLASS}
                  placeholder="Optional feedback"
                />
              </div>
            ) : feedback[question.questionId]?.trim() ? (
              <div>
                <p className="mb-1 text-sm font-medium text-foreground">
                  Feedback
                </p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {feedback[question.questionId]}
                </p>
              </div>
            ) : null}
          </AppCard>
        ))}
      </div>

      {canScore ? (
        <section className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => void handleSaveMarks()}
          >
            {isSubmitting ? "Saving..." : "Save marks"}
          </Button>
          {!review.isReviewDone ? (
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => setFinalizeOpen(true)}
            >
              Finalize review
            </Button>
          ) : null}
        </section>
      ) : null}

      <AppConfirmDialog
        open={finalizeOpen}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) {
            setFinalizeOpen(false);
          }
        }}
        title="Finalize review"
        description="This saves the marks and releases the result to the student. You can still update scores later if needed."
        confirmLabel="Finalize"
        loading={isSubmitting}
        onConfirm={() => {
          void handleFinalize();
        }}
      />
    </div>
  );
}
