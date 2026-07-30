import { useState, type FormEvent } from "react";
import type {
  QuizFormValues,
  QuizNavigationMode,
  QuizReviewDisplayMode,
} from "@/features/quizzes/domain/quizTypes";
import {
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

const REVIEW_DISPLAY_MODE_OPTIONS: Array<{
  value: QuizReviewDisplayMode;
  label: string;
}> = [
  {
    value: "Full",
    label: "Full — score, correct answers, and explanations",
  },
  {
    value: "CorrectAnswers",
    label: "Correct answers — score and correct options",
  },
  { value: "ScoreOnly", label: "Score only — hide answers and explanations" },
  {
    value: "Withheld",
    label: "Withheld — nothing until review is published",
  },
];

interface QuizFormProps {
  initialValues: QuizFormValues;
  submitLabel: string;
  isSubmitting?: boolean;
  showContextStudentId?: boolean;
  /** PortalAdmin must pick school + campus; SchoolAdmin may pick campus when missing on account. */
  showSchoolCampusFields?: boolean;
  requireCampusId?: boolean;
  requireSchoolId?: boolean;
  /** When true, quiz type is required (create). Edit hides the field because API update omits type. */
  requireQuizType?: boolean;
  suggestedTimeMinutes?: number | null;
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
  showSchoolCampusFields = false,
  requireCampusId = false,
  requireSchoolId = false,
  requireQuizType = false,
  suggestedTimeMinutes = null,
  onSubmit,
  onCancel,
}: QuizFormProps) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const { data: quizTypes = [] } = useLookups(
    requireQuizType ? LOOKUP_TYPES.QUIZ_TYPE : undefined,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (requireSchoolId && (values.schoolId == null || values.schoolId <= 0)) {
      setError("School is required.");
      return;
    }

    if (requireCampusId && (values.campusId == null || values.campusId <= 0)) {
      setError("Campus is required.");
      return;
    }

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

        {requireQuizType ? (
          <LookupSelect
            label="Quiz type"
            type={LOOKUP_TYPES.QUIZ_TYPE}
            value={values.quizTypeId || ""}
            disabled={isSubmitting}
            required
            onChange={(quizTypeId) => {
              const nextTypeId = quizTypeId === "" ? 0 : quizTypeId;
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
          />
        ) : null}

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

        {showSchoolCampusFields ? (
          <>
            <div>
              <FieldLabel htmlFor="schoolId" required={requireSchoolId}>
                School ID
              </FieldLabel>
              <input
                id="schoolId"
                type="number"
                value={values.schoolId ?? ""}
                disabled={isSubmitting || !requireSchoolId}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    schoolId: event.target.value
                      ? Number(event.target.value)
                      : null,
                  }))
                }
                className={inputClassName}
                min={1}
              />
            </div>
            <div>
              <FieldLabel htmlFor="campusId" required={requireCampusId}>
                Campus ID
              </FieldLabel>
              <input
                id="campusId"
                type="number"
                value={values.campusId ?? ""}
                disabled={isSubmitting}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    campusId: event.target.value
                      ? Number(event.target.value)
                      : null,
                  }))
                }
                className={inputClassName}
                min={1}
              />
            </div>
          </>
        ) : null}
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

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <FieldLabel htmlFor="timeLimitMinutes" optional>
            Time limit (minutes)
          </FieldLabel>
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
          {suggestedTimeMinutes != null && suggestedTimeMinutes > 0 ? (
            <button
              type="button"
              disabled={isSubmitting}
              className="mt-1.5 text-sm font-medium text-sky-700 hover:text-sky-900"
              onClick={() =>
                setValues((current) => ({
                  ...current,
                  timeLimitMinutes: suggestedTimeMinutes,
                }))
              }
            >
              Use suggested {suggestedTimeMinutes} min from questions
            </button>
          ) : null}
        </div>

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
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-3 sm:grid-cols-3 md:col-span-1">
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

        <div>
          <FieldLabel htmlFor="reviewDisplayMode">Review display</FieldLabel>
          <select
            id="reviewDisplayMode"
            value={values.reviewDisplayMode}
            disabled={isSubmitting}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                reviewDisplayMode: event.target.value as QuizReviewDisplayMode,
              }))
            }
            className={inputClassName}
          >
            {REVIEW_DISPLAY_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Controls what students see after submit. Withheld requires Review
            required so results can be published.
          </p>
        </div>
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
