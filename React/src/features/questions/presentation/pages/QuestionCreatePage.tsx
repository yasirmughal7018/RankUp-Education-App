import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
import { RequiredMark } from "@/core/components/RequiredMark";
import { useLookups } from "@/core/hooks/useLookups";
import { LOOKUP_TYPES } from "@/core/lookups/lookupTypes";
import * as questionApi from "@/features/questions/data/questionApi";
import {
  createEmptyQuestionForm,
  normalizeQuestionType,
  resetQuestionContent,
  type QuestionDetail,
  type QuestionFormValues,
} from "@/features/questions/domain/questionTypes";
import { QuestionForm } from "@/features/questions/presentation/components/QuestionForm";
import {
  StatusBadge,
  getQuestionStatusTone,
} from "@/features/questions/presentation/components/StatusBadge";
import type { QuestionSessionReviewState } from "@/features/questions/presentation/pages/QuestionSessionReviewPage";

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
        `Saved question #${created.questionId}. Class / Subject / Topic kept — add the next one.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

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
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Create questions"
        description="Add several questions for the same Class, Subject, and Topic. Scope stays sticky until you change it."
        action={
          <button
            type="button"
            onClick={() => navigate("/questions")}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
          >
            Back to bank
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
          Batch scope
        </span>
        <span className="text-slate-700">{scopeSummary}</span>
        {hasSaved ? (
          <span className="ml-auto rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            {savedQuestions.length} saved this session
          </span>
        ) : null}
      </div>

      {successMessage ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.7fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                New question
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Required fields are marked with <RequiredMark />.
              </p>
            </div>
          </div>

          <QuestionForm
            key={`batch-${savedQuestions.length}`}
            initialValues={formValues}
            lockScope
            submitLabel="Save & Add"
            isSubmitting={isSubmitting}
            onValuesChange={setFormValues}
            onSubmit={saveQuestion}
            onCancel={() => navigate("/questions")}
          />
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                Saved this session
              </h2>
              {hasSaved ? (
                <span className="text-xs font-medium text-slate-500">
                  {reviewIndex + 1} / {savedQuestions.length}
                </span>
              ) : null}
            </div>

            {!hasSaved ? (
              <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Newly saved questions appear here one by one for review. You
                stay on this page after each save.
              </p>
            ) : reviewing ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      label={reviewing.status}
                      tone={getQuestionStatusTone(
                        reviewing.status,
                        reviewing.isActive,
                      )}
                    />
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                      {normalizeQuestionType(reviewing.questionType)}
                    </span>
                    <span className="text-xs text-slate-500">
                      #{reviewing.questionId} · {reviewing.marks} marks
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-slate-900">
                    {reviewing.questionText}
                  </p>

                  {reviewing.options.length > 0 ? (
                    <ul className="mt-3 space-y-1.5">
                      {reviewing.options.map((option) => (
                        <li
                          key={option.optionId}
                          className={`rounded-xl px-3 py-2 text-xs ${
                            option.isCorrect
                              ? "bg-emerald-100 font-semibold text-emerald-900"
                              : "bg-white text-slate-600 ring-1 ring-slate-200"
                          }`}
                        >
                          {option.optionText}
                          {option.isCorrect ? " · correct" : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">
                      Descriptive — no options.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={reviewIndex <= 0}
                    onClick={() => setReviewIndex((index) => index - 1)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={openSessionReview}
                    className="text-xs font-semibold text-brand-700 hover:underline"
                  >
                    Open full detail
                  </button>
                  <button
                    type="button"
                    disabled={reviewIndex >= savedQuestions.length - 1}
                    onClick={() => setReviewIndex((index) => index + 1)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
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
                        className={`w-full rounded-xl px-3 py-2 text-left text-xs transition ${
                          index === reviewIndex
                            ? "bg-brand-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
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

          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-slate-100 shadow-sm">
            <h3 className="text-sm font-semibold">How this works</h3>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
              <li>1. Set Class, Subject, Topic, and Difficulty once.</li>
              <li>2. Choose the question type — answer UI changes with it.</li>
              <li>
                3. Use <strong className="text-white">Save &amp; Add</strong> to
                keep the same scope and clear only the question fields.
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
