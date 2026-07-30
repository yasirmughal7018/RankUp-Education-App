import { useState, type FormEvent, type ReactNode } from "react";
import { FieldLabel } from "@/core/components/FieldLabel";
import { LookupSelect } from "@/core/components/LookupSelect";
import { LOOKUP_TYPES } from "@/core/lookups/lookupTypes";
import {
  QUESTION_TYPE_META,
  QUESTION_TYPES_NOW,
  defaultAcceptedAnswersForType,
  defaultOptionsForType,
  normalizeQuestionType,
  usesAcceptedAnswers,
  usesAnswerOptions,
  validateQuestionForm,
  type QuestionFormValues,
  type QuestionType,
} from "@/features/questions/domain/questionTypes";
import { QuestionAcceptedAnswersEditor } from "@/features/questions/presentation/components/QuestionAcceptedAnswersEditor";
import { QuestionOptionsEditor } from "@/features/questions/presentation/components/QuestionOptionsEditor";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";
import { cn } from "@/lib/utils";

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

const inputClassName = FORM_FIELD_CLASS;

const requiredInputClassName = FORM_FIELD_CLASS;

function RequiredLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <FieldLabel
      htmlFor={htmlFor}
      required
      className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-foreground"
    >
      {children}
    </FieldLabel>
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
    <FieldLabel
      htmlFor={htmlFor}
      optional
      className="mb-1.5 block text-sm font-medium text-muted-foreground"
    >
      {children}
    </FieldLabel>
  );
}

/** Shared question form: type-specific fields, validation, and dual submit actions. */
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
        acceptedAnswers: defaultAcceptedAnswersForType(nextType),
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
  const showAcceptedAnswers = usesAcceptedAnswers(values.questionType);

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error ? (
        <div className="rounded-2xl border border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)] px-4 py-3 text-sm text-[var(--status-rejected-text)]">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Class · Subject · Topic
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              These stay the same while you add multiple questions for this set.
            </p>
          </div>
          {lockScope ? (
            <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {QUESTION_TYPES_NOW.map((type) => {
            const meta = QUESTION_TYPE_META[type];
            const selected = normalizeQuestionType(values.questionType) === type;
            return (
              <button
                key={type}
                type="button"
                disabled={isSubmitting}
                onClick={() => handleTypeChange(type)}
                className={cn(
                  "rounded-2xl border px-3 py-3 text-left transition",
                  selected
                    ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/30"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/50",
                )}
              >
                <div className="text-xs font-bold uppercase tracking-wide text-primary">
                  {meta.shortLabel}
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {meta.label}
                </div>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  {meta.description}
                </p>
              </button>
            );
          })}
        </div>
        {normalizeQuestionType(values.questionType) === "Descriptive" ? (
          <p className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Descriptive answers are free text and scored during teacher review.
          </p>
        ) : null}
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
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
      ) : null}

      {showAcceptedAnswers ? (
        <QuestionAcceptedAnswersEditor
          answers={values.acceptedAnswers}
          disabled={isSubmitting}
          onChange={(acceptedAnswers) => patchValues({ acceptedAnswers })}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onCancel}
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-70"
        >
          Cancel
        </button>

        {onSecondarySubmit && secondarySubmitLabel ? (
          <button
            type="submit"
            disabled={isSubmitting}
            onClick={() => setSubmitMode("secondary")}
            className="rounded-xl border border-primary bg-card px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-70"
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
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting && submitMode === "primary" ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
