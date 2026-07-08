import { useState, type FormEvent } from "react";
import type { QuizFormValues } from "@/features/quizzes/domain/quizTypes";
import { validateQuizForm } from "@/features/quizzes/domain/quizTypes";
import { LookupSelect } from "@/core/components/LookupSelect";
import { LOOKUP_TYPES } from "@/core/lookups/lookupTypes";

interface QuizFormProps {
  initialValues: QuizFormValues;
  submitLabel: string;
  isSubmitting?: boolean;
  showContextStudentId?: boolean;
  onSubmit: (values: QuizFormValues) => Promise<void>;
  onCancel: () => void;
}

const inputClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2";

export function QuizForm({
  initialValues,
  submitLabel,
  isSubmitting = false,
  showContextStudentId = false,
  onSubmit,
  onCancel,
}: QuizFormProps) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validationError = validateQuizForm(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await onSubmit(values);
    } catch (caught) {
      const apiError = caught as { message?: string };
      setError(apiError.message || "Unable to save quiz.");
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">
            Title
          </label>
          <input
            id="title"
            value={values.title}
            disabled={isSubmitting}
            onChange={(event) =>
              setValues((current) => ({ ...current, title: event.target.value }))
            }
            className={inputClassName}
            required
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            id="description"
            value={values.description}
            disabled={isSubmitting}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            className={`${inputClassName} min-h-24`}
          />
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
              topicId: 0,
            }))
          }
        />

        <LookupSelect
          label="Topic"
          type={LOOKUP_TYPES.TOPIC}
          parentId={values.subjectId || null}
          value={values.topicId || ""}
          disabled={isSubmitting || !values.subjectId}
          required
          onChange={(topicId) =>
            setValues((current) => ({
              ...current,
              topicId: topicId === "" ? 0 : topicId,
            }))
          }
        />

        <LookupSelect
          label="Difficulty"
          type={LOOKUP_TYPES.DIFFICULTY}
          value={values.difficultyLevelId || ""}
          disabled={isSubmitting}
          required
          onChange={(difficultyLevelId) =>
            setValues((current) => ({
              ...current,
              difficultyLevelId:
                difficultyLevelId === "" ? 0 : difficultyLevelId,
            }))
          }
        />

        {showContextStudentId ? (
          <div>
            <label
              htmlFor="contextStudentId"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Context student ID
            </label>
            <input
              id="contextStudentId"
              type="number"
              value={values.contextStudentId ?? ""}
              disabled={isSubmitting}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  contextStudentId: event.target.value
                    ? Number(event.target.value)
                    : null,
                }))
              }
              className={inputClassName}
              min={1}
            />
          </div>
        ) : null}
      </div>

      <div>
        <label htmlFor="instructions" className="mb-1 block text-sm font-medium text-slate-700">
          Instructions
        </label>
        <textarea
          id="instructions"
          value={values.instructions}
          disabled={isSubmitting}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              instructions: event.target.value,
            }))
          }
          className={`${inputClassName} min-h-28`}
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="timeLimitMinutes"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Time limit (minutes)
          </label>
          <input
            id="timeLimitMinutes"
            type="number"
            value={values.timeLimitMinutes ?? ""}
            disabled={isSubmitting}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                timeLimitMinutes: event.target.value
                  ? Number(event.target.value)
                  : null,
              }))
            }
            className={inputClassName}
            min={1}
          />
        </div>

        <div>
          <label
            htmlFor="allowedAttempts"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Allowed attempts
          </label>
          <input
            id="allowedAttempts"
            type="number"
            value={values.allowedAttempts ?? ""}
            disabled={isSubmitting}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                allowedAttempts: event.target.value
                  ? Number(event.target.value)
                  : null,
              }))
            }
            className={inputClassName}
            min={1}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={values.shuffleQuestions}
            disabled={isSubmitting}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                shuffleQuestions: event.target.checked,
              }))
            }
          />
          Shuffle questions
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={values.shuffleOptions}
            disabled={isSubmitting}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                shuffleOptions: event.target.checked,
              }))
            }
          />
          Shuffle options
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={values.isReviewRequired}
            disabled={isSubmitting}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                isReviewRequired: event.target.checked,
              }))
            }
          />
          Review required
        </label>
      </div>

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
