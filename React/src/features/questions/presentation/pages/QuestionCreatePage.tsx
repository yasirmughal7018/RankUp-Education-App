import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "@/core/components/PageHeader";
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

export function QuestionCreatePage() {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState(createEmptyQuestionForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedQuestions, setSavedQuestions] = useState<QuestionDetail[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const reviewing = savedQuestions[reviewIndex] ?? null;
  const hasSaved = savedQuestions.length > 0;

  const scopeSummary = useMemo(() => {
    const parts = [
      formValues.classId > 0 ? `Class #${formValues.classId}` : null,
      formValues.subjectId > 0 ? `Subject #${formValues.subjectId}` : null,
      formValues.topicId ? `Topic #${formValues.topicId}` : null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : "Choose class and subject first";
  }, [formValues.classId, formValues.subjectId, formValues.topicId]);

  async function saveQuestion(
    values: QuestionFormValues,
    { continueBatch }: { continueBatch: boolean },
  ) {
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

      if (continueBatch) {
        setSuccessMessage(
          `Saved question #${created.questionId}. Class / Subject / Topic kept — add the next one.`,
        );
      } else {
        setSuccessMessage(
          `Question #${created.questionId} saved. Review it on the right, or keep adding more.`,
        );
      }
    } finally {
      setIsSubmitting(false);
    }
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                New question
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Required fields are marked with{" "}
                <span className="font-semibold text-rose-600">*</span>.
              </p>
            </div>
          </div>

          <QuestionForm
            key={`batch-${savedQuestions.length}`}
            initialValues={formValues}
            lockScope
            submitLabel="Save & add another"
            secondarySubmitLabel="Save question"
            isSubmitting={isSubmitting}
            onValuesChange={setFormValues}
            onSubmit={(values) => saveQuestion(values, { continueBatch: true })}
            onSecondarySubmit={(values) =>
              saveQuestion(values, { continueBatch: false })
            }
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
                  <Link
                    to={`/questions/${reviewing.questionId}`}
                    className="text-xs font-semibold text-brand-700 hover:underline"
                  >
                    Open full detail
                  </Link>
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
                        <span className="font-semibold">#{question.questionId}</span>
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
                3. Use <strong className="text-white">Save &amp; add another</strong>{" "}
                to keep the same scope and clear only the question fields.
              </li>
              <li>4. Review each saved question in the panel — no auto redirect.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
