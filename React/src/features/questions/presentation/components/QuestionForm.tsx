import { useState, type FormEvent, type ReactNode } from "react";
import { LookupSelect } from "@/core/components/LookupSelect";
import { LOOKUP_TYPES } from "@/core/lookups/lookupTypes";
import {
  QUESTION_TYPE_META,
  QUESTION_TYPES,
  defaultOptionsForType,
  normalizeQuestionType,
  usesAnswerOptions,
  validateQuestionForm,
  type QuestionFormValues,
  type QuestionType,
} from "@/features/questions/domain/questionTypes";
import { QuestionOptionsEditor } from "@/features/questions/presentation/components/QuestionOptionsEditor";

interface QuestionFormProps {
  initialValues: QuestionFormValues;
  submitLabel: string;
  secondarySubmitLabel?: string;
  isSubmitting?: boolean;
  lockScope?: boolean;
  onSubmit: (values: QuestionFormValues) => Promise<void>;
  onSecondarySubmit?: (values: QuestionFormValues) => Promise<void>;
  onCancel: () => void;
  onValuesChange?: (values: QuestionFormValues) => void;
}

const inputClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:bg-slate-100";

const requiredInputClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:bg-slate-100 required:border-slate-300";

function RequiredLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-slate-800"
    >
      {children}
      <span className="text-rose-600" title="Required">
        *
      </span>
    </label>
  );
}

function OptionalLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-medium text-slate-600"
    >
      {children}
      <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>
    </label>
  );
}

export function QuestionForm({
  initialValues,
  submitLabel,
  secondarySubmitLabel,
  isSubmitting = false,
  lockScope = false,
  onSubmit,
  onSecondarySubmit,
  onCancel,
  onValuesChange,
}: QuestionFormProps) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [submitMode, setSubmitMode] = useState<"primary" | "secondary">(
    "primary",
  );

  function patchValues(patch: Partial<QuestionFormValues>) {
    setValues((current) => {
      const next = { ...current, ...patch };
      onValuesChange?.(next);
      return next;
    });
  }

  function handleTypeChange(nextType: QuestionType) {
    setValues((current) => {
      const previous = normalizeQuestionType(current.questionType);
      if (previous === nextType) {
        return current;
      }

      const next = {
        ...current,
        questionType: nextType,
        options: defaultOptionsForType(nextType),
      };
      onValuesChange?.(next);
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validationError = validateQuestionForm(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      if (submitMode === "secondary" && onSecondarySubmit) {
        await onSecondarySubmit(values);
      } else {
        await onSubmit(values);
      }
    } catch (caught) {
      const apiError = caught as { message?: string };
      setError(apiError.message || "Unable to save question.");
    }
  }

  const showOptions = usesAnswerOptions(values.questionType);

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-indigo-950">
              Class · Subject · Topic
            </h3>
            <p className="mt-1 text-xs text-indigo-700/80">
              These stay the same while you add multiple questions for this set.
            </p>
          </div>
          {lockScope ? (
            <span className="rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
              Sticky for this batch
            </span>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <RequiredLabel>Class</RequiredLabel>
            <LookupSelect
              label=""
              type={LOOKUP_TYPES.CLASS}
              value={values.classId || ""}
              disabled={isSubmitting}
              required
              onChange={(classId) =>
                patchValues({ classId: classId === "" ? 0 : classId })
              }
            />
          </div>

          <div>
            <RequiredLabel>Subject</RequiredLabel>
            <LookupSelect
              label=""
              type={LOOKUP_TYPES.SUBJECT}
              value={values.subjectId || ""}
              disabled={isSubmitting}
              required
              onChange={(subjectId) =>
                patchValues({
                  subjectId: subjectId === "" ? 0 : subjectId,
                  topicId: null,
                })
              }
            />
          </div>

          <div>
            <OptionalLabel>Topic</OptionalLabel>
            <LookupSelect
              label=""
              type={LOOKUP_TYPES.TOPIC}
              parentId={values.subjectId || null}
              value={values.topicId ?? ""}
              disabled={isSubmitting || !values.subjectId}
              allowEmpty
              emptyLabel="No topic"
              onChange={(topicId) =>
                patchValues({ topicId: topicId === "" ? null : topicId })
              }
            />
          </div>

          <div>
            <RequiredLabel>Difficulty</RequiredLabel>
            <LookupSelect
              label=""
              type={LOOKUP_TYPES.DIFFICULTY}
              value={values.difficultyLevel || ""}
              disabled={isSubmitting}
              required
              onChange={(difficultyLevel) =>
                patchValues({
                  difficultyLevel: difficultyLevel === "" ? 0 : difficultyLevel,
                })
              }
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <RequiredLabel>Question type</RequiredLabel>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {QUESTION_TYPES.map((type) => {
            const meta = QUESTION_TYPE_META[type];
            const selected = normalizeQuestionType(values.questionType) === type;
            return (
              <button
                key={type}
                type="button"
                disabled={isSubmitting}
                onClick={() => handleTypeChange(type)}
                className={`rounded-2xl border px-3 py-3 text-left transition ${
                  selected
                    ? "border-brand-500 bg-brand-50 shadow-sm ring-2 ring-brand-500/30"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="text-xs font-bold uppercase tracking-wide text-brand-700">
                  {meta.shortLabel}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {meta.label}
                </div>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">
                  {meta.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <RequiredLabel htmlFor="questionText">Question text</RequiredLabel>
          <textarea
            id="questionText"
            value={values.questionText}
            disabled={isSubmitting}
            onChange={(event) => patchValues({ questionText: event.target.value })}
            className={`${requiredInputClassName} min-h-32`}
            placeholder="Write a clear question for students..."
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <RequiredLabel htmlFor="marks">Marks</RequiredLabel>
            <input
              id="marks"
              type="number"
              value={values.marks}
              disabled={isSubmitting}
              onChange={(event) =>
                patchValues({ marks: Number(event.target.value) })
              }
              className={inputClassName}
              min={1}
              required
            />
          </div>

          <div>
            <RequiredLabel htmlFor="estimatedTimeSeconds">
              Time (seconds)
            </RequiredLabel>
            <input
              id="estimatedTimeSeconds"
              type="number"
              value={values.estimatedTimeSeconds}
              disabled={isSubmitting}
              onChange={(event) =>
                patchValues({
                  estimatedTimeSeconds: Number(event.target.value),
                })
              }
              className={inputClassName}
              min={1}
              required
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <OptionalLabel htmlFor="hint">Hint</OptionalLabel>
            <textarea
              id="hint"
              value={values.hint}
              disabled={isSubmitting}
              onChange={(event) => patchValues({ hint: event.target.value })}
              className={`${inputClassName} min-h-24`}
              placeholder="Optional tip shown during the attempt"
            />
          </div>

          <div>
            <OptionalLabel htmlFor="explanation">Explanation</OptionalLabel>
            <textarea
              id="explanation"
              value={values.explanation}
              disabled={isSubmitting}
              onChange={(event) =>
                patchValues({ explanation: event.target.value })
              }
              className={`${inputClassName} min-h-24`}
              placeholder="Shown after review / result"
            />
          </div>
        </div>
      </section>

      {showOptions ? (
        <QuestionOptionsEditor
          questionType={values.questionType}
          options={values.options}
          disabled={isSubmitting}
          onChange={(options) => patchValues({ options })}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <p className="font-semibold">Descriptive answer</p>
          <p className="mt-1 text-amber-800/90">
            No predefined options. Teachers mark the written response during
            review.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-5">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onCancel}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
        >
          Cancel
        </button>

        {onSecondarySubmit && secondarySubmitLabel ? (
          <button
            type="submit"
            disabled={isSubmitting}
            onClick={() => setSubmitMode("secondary")}
            className="rounded-xl border border-brand-600 bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting && submitMode === "secondary"
              ? "Saving..."
              : secondarySubmitLabel}
          </button>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          onClick={() => setSubmitMode("primary")}
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting && submitMode === "primary" ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
