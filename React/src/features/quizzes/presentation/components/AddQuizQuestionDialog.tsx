import { useEffect, useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import { FieldLabel } from "@/core/components/FieldLabel";
import {
  QUESTION_TYPES_NOW,
  defaultAcceptedAnswersForType,
  defaultOptionsForType,
  normalizeQuestionType,
  usesAcceptedAnswers,
  usesAnswerOptions,
  validateQuestionForm,
} from "@/features/questions/domain/questionTypes";
import { QuestionAcceptedAnswersEditor } from "@/features/questions/presentation/components/QuestionAcceptedAnswersEditor";
import { QuestionOptionsEditor } from "@/features/questions/presentation/components/QuestionOptionsEditor";
import {
  createEmptyQuizQuestionInput,
  mapQuizQuestionToInput,
  type AddQuizQuestionInput,
  type QuizQuestionItem,
} from "@/features/quizzes/domain/quizTypes";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";

interface AddQuizQuestionDialogProps {
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: AddQuizQuestionInput) => Promise<void>;
  initialQuestion?: QuizQuestionItem | null;
  classId?: number;
  subjectId?: number;
  title?: string;
  submitLabel?: string;
}

const inputClassName = FORM_FIELD_CLASS;

/** Edit an existing quiz question (inline content). New questions come from the bank. */
export function AddQuizQuestionDialog({
  isSubmitting,
  onClose,
  onSubmit,
  initialQuestion = null,
  classId,
  subjectId,
  title,
  submitLabel,
}: AddQuizQuestionDialogProps) {
  const isEdit = initialQuestion != null;
  const [values, setValues] = useState(() =>
    initialQuestion
      ? mapQuizQuestionToInput(initialQuestion)
      : createEmptyQuizQuestionInput(),
  );
  const [error, setError] = useState<string | null>(null);

  const showOptions = usesAnswerOptions(values.questionType);
  const showAcceptedAnswers = usesAcceptedAnswers(values.questionType);

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

    const questionType = normalizeQuestionType(values.questionType);

    const validationError = validateQuestionForm({
      questionText: values.questionText,
      questionType,
      classId: classId && classId > 0 ? classId : 1,
      subjectId: subjectId && subjectId > 0 ? subjectId : 1,
      topicId: null,
      difficultyLevel: 1,
      marks: values.marks,
      estimatedTimeSeconds: values.estimatedTimeSeconds,
      hint: values.hint,
      explanation: values.explanation,
      options: usesAnswerOptions(questionType) ? values.options : [],
      acceptedAnswers: usesAcceptedAnswers(questionType)
        ? values.acceptedAnswers
        : [],
    });
    if (
      validationError &&
      !validationError.includes("Class and subject") &&
      !validationError.includes("Difficulty")
    ) {
      setError(validationError);
      return;
    }

    try {
      await onSubmit({
        ...values,
        questionType,
        options: usesAnswerOptions(questionType)
          ? values.options
              .filter(
                (option) =>
                  option.optionText.trim() ||
                  Boolean(option.optionImageUrl?.trim()),
              )
              .map((option) => ({
                optionText: option.optionText.trim(),
                isCorrect: option.isCorrect,
                optionImageUrl: option.optionImageUrl?.trim() || null,
              }))
          : [],
        acceptedAnswers: usesAcceptedAnswers(questionType)
          ? values.acceptedAnswers
              .filter((answer) => answer.answerText.trim())
              .map((answer) => ({
                ...answer,
                answerText: answer.answerText.trim(),
              }))
          : [],
      });
    } catch (caught) {
      const apiError = caught as ApiError;
      setError(apiError.message || "Unable to save question.");
    }
  }

  const dialogTitle =
    title ?? (isEdit ? "Edit quiz question" : "Edit question");
  const dialogSubmitLabel =
    submitLabel ?? (isSubmitting ? "Saving..." : "Save changes");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-slate-900">{dialogTitle}</h2>
        <p className="mt-2 text-sm text-slate-600">
          Update this question on the quiz.
        </p>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div>
            <FieldLabel htmlFor="questionText" required>
              Question text
            </FieldLabel>
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
              <FieldLabel htmlFor="questionType" required>
                Type
              </FieldLabel>
              <select
                id="questionType"
                value={normalizeQuestionType(values.questionType)}
                disabled={isSubmitting}
                onChange={(event) => {
                  const nextType = normalizeQuestionType(event.target.value);
                  setValues((current) => ({
                    ...current,
                    questionType: nextType,
                    options: defaultOptionsForType(nextType),
                    acceptedAnswers: defaultAcceptedAnswersForType(nextType),
                  }));
                }}
                className={inputClassName}
              >
                {QUESTION_TYPES_NOW.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel htmlFor="marks" required>
                Marks
              </FieldLabel>
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
              <FieldLabel htmlFor="estimatedTimeSeconds" required>
                Time (seconds)
              </FieldLabel>
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

          {showOptions ? (
            <QuestionOptionsEditor
              questionType={values.questionType}
              options={values.options}
              disabled={isSubmitting}
              onChange={(options) =>
                setValues((current) => ({ ...current, options }))
              }
            />
          ) : null}

          {showAcceptedAnswers ? (
            <QuestionAcceptedAnswersEditor
              answers={values.acceptedAnswers}
              disabled={isSubmitting}
              onChange={(acceptedAnswers) =>
                setValues((current) => ({ ...current, acceptedAnswers }))
              }
            />
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="hint" optional>
                Hint
              </FieldLabel>
              <input
                id="hint"
                value={values.hint}
                disabled={isSubmitting}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    hint: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </div>
            <div>
              <FieldLabel htmlFor="explanation" optional>
                Explanation
              </FieldLabel>
              <input
                id="explanation"
                value={values.explanation}
                disabled={isSubmitting}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    explanation: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
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
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {dialogSubmitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
