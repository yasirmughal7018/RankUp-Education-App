/**
 * Batch create page: sticky Class/Subject/Topic scope, submit each as PendingReview,
 * keep a session sidebar for quick review. Full detail opens a separate review route.
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { RequiredMark } from "@/core/components/RequiredMark";
import { useLookups } from "@/core/hooks/useLookups";
import { LOOKUP_TYPES } from "@/core/lookups/lookupTypes";
import * as questionApi from "@/features/questions/data/questionApi";
import {
  createEmptyQuestionForm,
  displayQuestionStatusLabel,
  normalizeQuestionType,
  resetQuestionContent,
  type QuestionDetail,
  type QuestionFormValues,
} from "@/features/questions/domain/questionTypes";
import { QuestionForm } from "@/features/questions/presentation/components/QuestionForm";
import {
  StatusBadge,
  getQuestionActivityStatusKey,
  getQuestionWorkflowStatusKey,
} from "@/features/questions/presentation/components/StatusBadge";
import type { QuestionSessionReviewState } from "@/features/questions/presentation/pages/QuestionSessionReviewPage";
import { cn } from "@/lib/utils";

/** One-shot location state when returning from the session review page. */
interface CreatePageRestoreState {
  savedQuestions?: QuestionDetail[];
  formValues?: QuestionFormValues;
  reviewIndex?: number;
}

function lookupName(
  items: { id: number; name: string }[] | undefined,
  id: number | null | undefined,
  fallbackLabel: string,
): string | null {
  if (!id || id <= 0) {
    return null;
  }
  return items?.find((item) => item.id === id)?.name ?? `${fallbackLabel} #${id}`;
}

export function QuestionCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const restoreState = location.state as CreatePageRestoreState | null;

  const [formValues, setFormValues] = useState<QuestionFormValues>(
    () => restoreState?.formValues ?? createEmptyQuestionForm(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedQuestions, setSavedQuestions] = useState<QuestionDetail[]>(
    () => restoreState?.savedQuestions ?? [],
  );
  const [reviewIndex, setReviewIndex] = useState(
    () => restoreState?.reviewIndex ?? 0,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!restoreState) {
      return;
    }
    navigate(location.pathname, { replace: true, state: null });
    // Clear one-shot restore payload after applying it to local state.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount when returning from session review
  }, []);

  const reviewing = savedQuestions[reviewIndex] ?? null;
  const hasSaved = savedQuestions.length > 0;

  const { data: classes = [] } = useLookups(LOOKUP_TYPES.CLASS);
  const { data: subjects = [] } = useLookups(LOOKUP_TYPES.SUBJECT);
  const { data: topics = [] } = useLookups(
    LOOKUP_TYPES.TOPIC,
    formValues.subjectId > 0 ? formValues.subjectId : null,
  );

  const scopeSummary = useMemo(() => {
    const parts = [
      lookupName(classes, formValues.classId, "Class"),
      lookupName(subjects, formValues.subjectId, "Subject"),
      lookupName(topics, formValues.topicId, "Topic"),
    ].filter(Boolean);
    return parts.length > 0
      ? parts.join(" · ")
      : "Choose class and subject first";
  }, [
    classes,
    subjects,
    topics,
    formValues.classId,
    formValues.subjectId,
    formValues.topicId,
  ]);

  /**
   * Submit for review, append to session list, then reset content while keeping sticky scope.
   * Created rows are PendingReview until Campus/School/Portal Admin approves.
   */
  async function saveQuestion(values: QuestionFormValues) {
    setIsSubmitting(true);
    setSuccessMessage(null);
    try {
      const created = await questionApi.createQuestion(values);
      setSavedQuestions((current) => {
        const next = [...current, created];
        setReviewIndex(next.length - 1);
        return next;
      });

      setFormValues(resetQuestionContent(values));
      setSuccessMessage(
        `Submitted question #${created.questionId} for review. Class / Subject / Topic kept — add the next one.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  /** Hand off the in-session batch to the full review page. */
  function openSessionReview() {
    if (!hasSaved) {
      return;
    }

    navigate("/questions/new/review", {
      state: {
        questions: savedQuestions,
        index: reviewIndex,
        formValues,
      } satisfies QuestionSessionReviewState,
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Create questions"
        description="Add several questions for the same Class, Subject, and Topic."
        backTo="/questions"
        backAriaLabel="Back to question bank"
      />

      {successMessage ? (
        <div className="mb-6 rounded-2xl border border-[var(--status-approved-border)] bg-[var(--status-approved-bg)] px-4 py-3 text-sm text-[var(--status-approved-text)]">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.7fr)]">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <h2 className="text-lg font-semibold text-foreground">
                New question
              </h2>
              {hasSaved ? (
                <span className="rounded-full border border-[var(--status-approved-border)] bg-[var(--status-approved-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--status-approved-text)]">
                  {savedQuestions.length} saved
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
              <span className="font-medium text-foreground/80">{scopeSummary}</span>
              <span className="mx-1.5 text-border" aria-hidden>
                ·
              </span>
              Required fields marked <RequiredMark />
            </p>
          </div>

          <QuestionForm
            key={`batch-${savedQuestions.length}`}
            initialValues={formValues}
            lockScope
            submitLabel="Submit for review & Add"
            isSubmitting={isSubmitting}
            onValuesChange={setFormValues}
            onSubmit={(values) => saveQuestion(values)}
            onCancel={() => navigate("/questions")}
          />
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">
                Saved this session
              </h2>
              {hasSaved ? (
                <span className="text-xs font-medium text-muted-foreground">
                  {reviewIndex + 1} / {savedQuestions.length}
                </span>
              ) : null}
            </div>

            {!hasSaved ? (
              <p className="mt-4 rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
                Newly saved questions appear here one by one for review. You
                stay on this page after each save.
              </p>
            ) : reviewing ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      label={displayQuestionStatusLabel(reviewing.status)}
                      status={getQuestionWorkflowStatusKey(reviewing.status)}
                    />
                    <StatusBadge
                      label={reviewing.isActive ? "Active" : "Inactive"}
                      status={getQuestionActivityStatusKey(reviewing.isActive)}
                    />
                    <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      {normalizeQuestionType(reviewing.questionType)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      #{reviewing.questionId} · {reviewing.marks} marks
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-foreground">
                    {reviewing.questionText}
                  </p>

                  {reviewing.options.length > 0 ? (
                    <ul className="mt-3 space-y-1.5">
                      {reviewing.options.map((option) => (
                        <li
                          key={option.optionId}
                          className={cn(
                            "rounded-xl px-3 py-2 text-xs",
                            option.isCorrect
                              ? "border border-[var(--status-approved-border)] bg-[var(--status-approved-bg)] font-semibold text-[var(--status-approved-text)]"
                              : "border border-border bg-background text-muted-foreground",
                          )}
                        >
                          {option.optionText}
                          {option.isCorrect ? " · correct" : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (reviewing.acceptedAnswers?.length ?? 0) > 0 ? (
                    <ul className="mt-3 space-y-1.5">
                      {reviewing.acceptedAnswers.map((answer) => (
                        <li
                          key={answer.acceptedAnswerId}
                          className="rounded-xl border border-[var(--status-approved-border)] bg-[var(--status-approved-bg)] px-3 py-2 text-xs font-semibold text-[var(--status-approved-text)]"
                        >
                          {answer.answerText}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      No options on this question.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={reviewIndex <= 0}
                    onClick={() => setReviewIndex((index) => index - 1)}
                    className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={openSessionReview}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Open full detail
                  </button>
                  <button
                    type="button"
                    disabled={reviewIndex >= savedQuestions.length - 1}
                    onClick={() => setReviewIndex((index) => index + 1)}
                    className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>

                <ol className="max-h-48 space-y-2 overflow-y-auto">
                  {savedQuestions.map((question, index) => (
                    <li key={question.questionId}>
                      <button
                        type="button"
                        onClick={() => setReviewIndex(index)}
                        className={cn(
                          "w-full rounded-xl px-3 py-2 text-left text-xs transition",
                          index === reviewIndex
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground hover:bg-muted/80",
                        )}
                      >
                        <span className="font-semibold">
                          #{question.questionId}
                        </span>
                        <span className="ml-2 line-clamp-1 opacity-90">
                          {question.questionText}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-border bg-muted/50 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">How this works</h3>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
              <li>1. Set Class, Subject, Topic, and Difficulty once.</li>
              <li>2. Choose the question type — answer UI changes with it.</li>
              <li>
                3. Use{" "}
                <strong className="text-foreground">Submit for review &amp; Add</strong>{" "}
                — creates PendingReview (inactive until Campus/School/Portal Admin Approves).
                Class, Subject, and Topic stay for the next question.
              </li>
              <li>
                4. Open full detail to browse every question saved in this
                session.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
