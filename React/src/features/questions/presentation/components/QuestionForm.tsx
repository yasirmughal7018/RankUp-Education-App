import { useState, type FormEvent } from "react";
import {
  QUESTION_TYPES,
  validateQuestionForm,
  type QuestionFormValues,
} from "@/features/questions/domain/questionTypes";
import { QuestionOptionsEditor } from "@/features/questions/presentation/components/QuestionOptionsEditor";
import { LookupSelect } from "@/core/components/LookupSelect";
import { LOOKUP_TYPES } from "@/core/lookups/lookupTypes";

interface QuestionFormProps {
  initialValues: QuestionFormValues;
  submitLabel: string;
  isSubmitting?: boolean;
  onSubmit: (values: QuestionFormValues) => Promise<void>;
  onCancel: () => void;
}

const inputClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2";

export function QuestionForm({
  initialValues,
  submitLabel,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: QuestionFormProps) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const isMcq = values.questionType.toLowerCase().includes("mcq");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validationError = validateQuestionForm(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await onSubmit(values);
    } catch (caught) {
      const apiError = caught as { message?: string };
      setError(apiError.message || "Unable to save question.");
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div>
        <label htmlFor="questionText" className="mb-1 block text-sm font-medium text-slate-700">
          Question text
        </label>
        <textarea
          id="questionText"
          value={values.questionText}
          disabled={isSubmitting}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              questionText: event.target.value,
            }))
          }
          className={`${inputClassName} min-h-28`}
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label htmlFor="questionType" className="mb-1 block text-sm font-medium text-slate-700">
            Type
          </label>
          <select
            id="questionType"
            value={values.questionType}
            disabled={isSubmitting}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                questionType: event.target.value,
              }))
            }
            className={inputClassName}
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <LookupSelect
          label="Class"
          type={LOOKUP_TYPES.CLASS}
          value={values.classId || ""}
          disabled={isSubmitting}
          required
          onChange={(classId) =>
            setValues((current) => ({
              ...current,
              classId: classId === "" ? 0 : classId,
            }))
          }
        />

        <LookupSelect
          label="Subject"
          type={LOOKUP_TYPES.SUBJECT}
          value={values.subjectId || ""}
          disabled={isSubmitting}
          required
          onChange={(subjectId) =>
            setValues((current) => ({
              ...current,
              subjectId: subjectId === "" ? 0 : subjectId,
              topicId: null,
            }))
          }
        />

        <LookupSelect
          label="Topic"
          type={LOOKUP_TYPES.TOPIC}
          parentId={values.subjectId || null}
          value={values.topicId ?? ""}
          disabled={isSubmitting || !values.subjectId}
          allowEmpty
          emptyLabel="No topic"
          onChange={(topicId) =>
            setValues((current) => ({
              ...current,
              topicId: topicId === "" ? null : topicId,
            }))
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <LookupSelect
          label="Difficulty"
          type={LOOKUP_TYPES.DIFFICULTY}
          value={values.difficultyLevel || ""}
          disabled={isSubmitting}
          required
          onChange={(difficultyLevel) =>
            setValues((current) => ({
              ...current,
              difficultyLevel: difficultyLevel === "" ? 0 : difficultyLevel,
            }))
          }
        />

        <div>
          <label htmlFor="marks" className="mb-1 block text-sm font-medium text-slate-700">
            Marks
          </label>
          <input
            id="marks"
            type="number"
            value={values.marks}
            disabled={isSubmitting}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                marks: Number(event.target.value),
              }))
            }
            className={inputClassName}
            min={1}
            required
          />
        </div>

        <div>
          <label
            htmlFor="estimatedTimeSeconds"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Time (seconds)
          </label>
          <input
            id="estimatedTimeSeconds"
            type="number"
            value={values.estimatedTimeSeconds}
            disabled={isSubmitting}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                estimatedTimeSeconds: Number(event.target.value),
              }))
            }
            className={inputClassName}
            min={1}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="hint" className="mb-1 block text-sm font-medium text-slate-700">
            Hint
          </label>
          <textarea
            id="hint"
            value={values.hint}
            disabled={isSubmitting}
            onChange={(event) =>
              setValues((current) => ({ ...current, hint: event.target.value }))
            }
            className={`${inputClassName} min-h-24`}
          />
        </div>

        <div>
          <label htmlFor="explanation" className="mb-1 block text-sm font-medium text-slate-700">
            Explanation
          </label>
          <textarea
            id="explanation"
            value={values.explanation}
            disabled={isSubmitting}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                explanation: event.target.value,
              }))
            }
            className={`${inputClassName} min-h-24`}
          />
        </div>
      </div>

      {isMcq ? (
        <QuestionOptionsEditor
          options={values.options}
          disabled={isSubmitting}
          onChange={(options) =>
            setValues((current) => ({
              ...current,
              options,
            }))
          }
        />
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Descriptive questions do not require predefined options.
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
