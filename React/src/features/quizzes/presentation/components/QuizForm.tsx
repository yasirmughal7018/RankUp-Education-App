import { useEffect, useState, type FormEvent } from "react";
import type { UserRole } from "@/core/api/types";
import type {
  QuizFormValues,
  QuizNavigationMode,
} from "@/features/quizzes/domain/quizTypes";
import {
  quizTypesForRole,
  resolveQuizTypeDefaults,
  validateQuizForm,
} from "@/features/quizzes/domain/quizTypes";
import { FieldLabel } from "@/core/components/FieldLabel";
import { LookupSelect } from "@/core/components/LookupSelect";
import { useLookups } from "@/core/hooks/useLookups";
import { LOOKUP_TYPES } from "@/core/lookups/lookupTypes";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";

const NAVIGATION_MODE_OPTIONS: Array<{
  value: QuizNavigationMode;
  label: string;
}> = [
  { value: "Free", label: "Free — jump to any question" },
  { value: "Sequential", label: "Sequential — previous/next only" },
  { value: "Locked", label: "Locked — next after answering" },
];

interface QuizFormProps {
  initialValues: QuizFormValues;
  submitLabel: string;
  isSubmitting?: boolean;
  showContextStudentId?: boolean;
  authorRole?: UserRole;
  /** When true, quiz type is required (create). Edit hides the field because API update omits type. */
  requireQuizType?: boolean;
  onSubmit: (values: QuizFormValues) => Promise<void>;
  onCancel: () => void;
}

const inputClassName = FORM_FIELD_CLASS;

/** Shared quiz metadata form for create and edit flows. */
export function QuizForm({
  initialValues,
  submitLabel,
  isSubmitting = false,
  showContextStudentId = false,
  authorRole,
  requireQuizType = false,
  onSubmit,
  onCancel,
}: QuizFormProps) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const { data: allQuizTypes = [], isLoading: quizTypesLoading } = useLookups(
    requireQuizType ? LOOKUP_TYPES.QUIZ_TYPE : undefined,
  );
  const quizTypes = quizTypesForRole(authorRole, allQuizTypes);

  useEffect(() => {
    if (!requireQuizType || quizTypes.length === 0 || values.quizTypeId > 0) {
      return;
    }

    if (quizTypes.length === 1) {
      const onlyType = quizTypes[0];
      const typeDefaults = resolveQuizTypeDefaults(onlyType.name);
      setValues((current) => ({
        ...current,
        quizTypeId: onlyType.id,
        ...typeDefaults,
      }));
    }
  }, [requireQuizType, quizTypes, values.quizTypeId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validationError = validateQuizForm(values, requireQuizType);
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
          <FieldLabel htmlFor="title" required>
            Title
          </FieldLabel>
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
          <FieldLabel htmlFor="description" optional>
            Description
          </FieldLabel>
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
          allowEmpty
          emptyLabel="None"
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
          allowEmpty
          emptyLabel="None"
          onChange={(difficultyLevelId) =>
            setValues((current) => ({
              ...current,
              difficultyLevelId:
                difficultyLevelId === "" ? 0 : difficultyLevelId,
            }))
          }
        />

        {requireQuizType ? (
          <div>
            <FieldLabel htmlFor="quizTypeId" required>
              Quiz type
            </FieldLabel>
            <select
              id="quizTypeId"
              value={values.quizTypeId || ""}
              disabled={
                isSubmitting ||
                quizTypesLoading ||
                (authorRole === "Parent" || authorRole === "Tutor") &&
                  quizTypes.length === 1
              }
              required
              onChange={(event) => {
                const nextTypeId = event.target.value
                  ? Number(event.target.value)
                  : 0;
                const typeName =
                  quizTypes.find((item) => item.id === nextTypeId)?.name ?? "";
                const typeDefaults =
                  nextTypeId > 0 ? resolveQuizTypeDefaults(typeName) : null;

                setValues((current) => ({
                  ...current,
                  quizTypeId: nextTypeId,
                  ...(typeDefaults ?? {}),
                }));
              }}
              className={inputClassName}
            >
              <option value="" disabled>
                {quizTypesLoading ? "Loading..." : "Select quiz type"}
              </option>
              {quizTypes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {(authorRole === "Parent" || authorRole === "Tutor") &&
            quizTypes.length === 1 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                ParentPrivate quizzes are created automatically for linked{" "}
                {authorRole === "Tutor" ? "students" : "children"}.
              </p>
            ) : null}
          </div>
        ) : null}

        <div>
          <FieldLabel htmlFor="allowedAttempts" optional>
            Allowed attempts
          </FieldLabel>
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

        {showContextStudentId ? (
          <div>
            <FieldLabel htmlFor="contextStudentId" optional>
              Context student ID
            </FieldLabel>
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

        <div>
          <FieldLabel htmlFor="navigationMode">Navigation mode</FieldLabel>
          <select
            id="navigationMode"
            value={values.navigationMode}
            disabled={isSubmitting}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                navigationMode: event.target.value as QuizNavigationMode,
              }))
            }
            className={inputClassName}
          >
            {NAVIGATION_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="instructions" required>
          Instructions
        </FieldLabel>
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

      <div className="grid gap-3 sm:grid-cols-3">
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

      <div>
        <FieldLabel
          htmlFor="randomQuestionCount"
          optional
          hint="Leave blank to use all attached questions. When set, each student receives a random subset of this size at attempt start (frozen for that attempt)."
        >
          Random questions per attempt
        </FieldLabel>
        <input
          id="randomQuestionCount"
          type="number"
          min={1}
          value={values.randomQuestionCount ?? ""}
          disabled={isSubmitting}
          onChange={(event) => {
            const raw = event.target.value.trim();
            setValues((current) => ({
              ...current,
              randomQuestionCount: raw === "" ? null : Number(raw),
            }));
          }}
          className={inputClassName}
          placeholder="All questions"
        />
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
