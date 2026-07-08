import { useEffect, useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import { QUESTION_TYPES } from "@/features/questions/domain/questionTypes";
import { QuestionOptionsEditor } from "@/features/questions/presentation/components/QuestionOptionsEditor";
import {
  createEmptyQuizQuestionInput,
  type AddQuizQuestionInput,
} from "@/features/quizzes/domain/quizTypes";

interface AddQuizQuestionDialogProps {
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: AddQuizQuestionInput) => Promise<void>;
}

const inputClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2";

export function AddQuizQuestionDialog({
  isSubmitting,
  onClose,
  onSubmit,
}: AddQuizQuestionDialogProps) {
  const [values, setValues] = useState(createEmptyQuizQuestionInput());
  const [error, setError] = useState<string | null>(null);
  const isMcq = values.questionType.toLowerCase().includes("mcq");

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isSubmitting, onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!values.questionText.trim()) {
      setError("Question text is required.");
      return;
    }

    if (values.marks <= 0) {
      setError("Marks must be greater than zero.");
      return;
    }

    if (isMcq) {
      const options = values.options.filter((option) => option.optionText.trim());
      if (options.length < 2) {
        setError("MCQ questions need at least two options.");
        return;
      }

      if (!options.some((option) => option.isCorrect)) {
        setError("At least one option must be marked correct.");
        return;
      }
    }

    try {
      await onSubmit(values);
    } catch (caught) {
      const apiError = caught as ApiError;
      setError(apiError.message || "Unable to add question.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-slate-900">Add question to quiz</h2>
        <p className="mt-2 text-sm text-slate-600">
          Creates a new question and attaches it to this quiz.
        </p>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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
              className={`${inputClassName} min-h-24`}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
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
          ) : null}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
            >
              {isSubmitting ? "Adding..." : "Add question"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
