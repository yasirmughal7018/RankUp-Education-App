import { useMemo, useState, type FormEvent } from "react";
import type {
  QuizFormValues,
  QuizNavigationMode,
} from "@/features/quizzes/domain/quizTypes";
import {
  resolveQuizTypeDefaults,
  validateQuizForm,
} from "@/features/quizzes/domain/quizTypes";
import { FieldLabel } from "@/core/components/FieldLabel";
import { LookupSelect } from "@/core/components/LookupSelect";
import { useLookups } from "@/core/hooks/useLookups";
import { LOOKUP_TYPES } from "@/core/lookups/lookupTypes";
import {
  useDirectoryCampusesQuery,
  useDirectorySchoolsQuery,
} from "@/features/directory/presentation/hooks/useDirectoryQueries";
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
  /** PortalAdmin / SchoolAdmin: show school + campus ownership fields (optional on create). */
  showSchoolCampusFields?: boolean;
  requireCampusId?: boolean;
  requireSchoolId?: boolean;
  /** PortalAdmin can pick school; SchoolAdmin school comes from the token (read-only). */
  schoolEditable?: boolean;
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
  showSchoolCampusFields = false,
  requireCampusId = false,
  requireSchoolId = false,
  schoolEditable = false,
  requireQuizType = false,
  onSubmit,
  onCancel,
}: QuizFormProps) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const { data: quizTypes = [] } = useLookups(
    requireQuizType ? LOOKUP_TYPES.QUIZ_TYPE : undefined,
  );
  const { data: schools = [], isLoading: schoolsLoading } =
    useDirectorySchoolsQuery(showSchoolCampusFields);
  const selectedSchoolId = values.schoolId ?? 0;
  const { data: campuses = [], isLoading: campusesLoading } =
    useDirectoryCampusesQuery(selectedSchoolId, showSchoolCampusFields);

  const schoolOptions = useMemo(
    () =>
      schools.filter(
        (school) => school.isActive || school.id === values.schoolId,
      ),
    [schools, values.schoolId],
  );
  const campusOptions = useMemo(
    () =>
      campuses.filter(
        (campus) => campus.isActive || campus.id === values.campusId,
      ),
    [campuses, values.campusId],
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

        {showSchoolCampusFields ? (
          <>
            <div>
              <FieldLabel
                htmlFor="schoolId"
                required={requireSchoolId}
                optional={!requireSchoolId}
                hint="Places this quiz in an organization. This is not the student audience — after publish (and approval if needed), use Assign to choose public catalog, whole school, grade, section, or selected students."
              >
                School
              </FieldLabel>
              <select
                id="schoolId"
                value={values.schoolId ?? ""}
                disabled={isSubmitting || schoolsLoading || !schoolEditable}
                onChange={(event) => {
                  const nextSchoolId = event.target.value
                    ? Number(event.target.value)
                    : null;
                  setValues((current) => ({
                    ...current,
                    schoolId: nextSchoolId,
                    campusId: null,
                  }));
                }}
                className={inputClassName}
                required={requireSchoolId}
              >
                <option value="">
                  {schoolsLoading ? "Loading schools..." : "Select school"}
                </option>
                {schoolOptions.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel
                htmlFor="campusId"
                required={requireCampusId}
                optional={!requireCampusId}
                hint="Campus within the selected school. This is ownership context only — student audience is chosen later with Assign."
              >
                Campus
              </FieldLabel>
              <select
                id="campusId"
                value={values.campusId ?? ""}
                disabled={
                  isSubmitting || campusesLoading || !values.schoolId
                }
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    campusId: event.target.value
                      ? Number(event.target.value)
                      : null,
                  }))
                }
                className={inputClassName}
                required={requireCampusId}
              >
                <option value="">
                  {campusesLoading
                    ? "Loading campuses..."
                    : !values.schoolId
                      ? "Select a school first"
                      : "Select campus"}
                </option>
                {campusOptions.map((campus) => (
                  <option key={campus.id} value={campus.id}>
                    {campus.name}
                  </option>
                ))}
              </select>
            </div>
          </>
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
