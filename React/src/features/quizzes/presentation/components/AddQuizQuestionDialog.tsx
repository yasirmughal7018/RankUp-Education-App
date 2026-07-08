import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ApiError } from "@/core/api/types";
import { QUESTION_TYPES } from "@/features/questions/domain/questionTypes";
import { QuestionOptionsEditor } from "@/features/questions/presentation/components/QuestionOptionsEditor";
import { useQuestionsQuery } from "@/features/questions/presentation/hooks/useQuestionQueries";
import {
  createEmptyQuizQuestionInput,
  type AddQuizQuestionInput,
  type AttachBankQuestionInput,
  type QuizQuestionItem,
} from "@/features/quizzes/domain/quizTypes";

type DialogMode = "create" | "bank";

interface AddQuizQuestionDialogProps {
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: AddQuizQuestionInput) => Promise<void>;
  onAttachFromBank?: (input: AttachBankQuestionInput) => Promise<void>;
  initialQuestion?: QuizQuestionItem | null;
  classId?: number;
  subjectId?: number;
  excludeQuestionIds?: number[];
  title?: string;
  submitLabel?: string;
}

const inputClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2";

function mapQuestionToInput(question: QuizQuestionItem): AddQuizQuestionInput {
  return {
    questionText: question.questionText,
    questionType: question.questionType,
    marks: question.marks,
    estimatedTimeSeconds: 60,
    hint: question.hint ?? "",
    explanation: "",
    options:
      question.options.length > 0
        ? question.options.map((option) => ({
            optionText: option.optionText,
            isCorrect: option.isCorrect,
          }))
        : [
            { optionText: "", isCorrect: true },
            { optionText: "", isCorrect: false },
          ],
  };
}

export function AddQuizQuestionDialog({
  isSubmitting,
  onClose,
  onSubmit,
  onAttachFromBank,
  initialQuestion = null,
  classId,
  subjectId,
  excludeQuestionIds = [],
  title,
  submitLabel,
}: AddQuizQuestionDialogProps) {
  const isEdit = initialQuestion != null;
  const [mode, setMode] = useState<DialogMode>("create");
  const [values, setValues] = useState(() =>
    initialQuestion
      ? mapQuestionToInput(initialQuestion)
      : createEmptyQuizQuestionInput(),
  );
  const [error, setError] = useState<string | null>(null);
  const [bankSearch, setBankSearch] = useState("");
  const [selectedBankQuestionId, setSelectedBankQuestionId] = useState<number | null>(
    null,
  );
  const [bankMarks, setBankMarks] = useState<number | "">("");

  const bankFilters = useMemo(
    () => ({
      pendingOnly: false,
      activeFilter: "true" as const,
      subjectId: subjectId && subjectId > 0 ? subjectId : ("" as const),
      classId: classId && classId > 0 ? classId : ("" as const),
    }),
    [classId, subjectId],
  );

  const {
    data: bankQuestions = [],
    isLoading: bankLoading,
    error: bankError,
  } = useQuestionsQuery(bankFilters);

  const excludedIds = useMemo(
    () => new Set(excludeQuestionIds),
    [excludeQuestionIds],
  );

  const filteredBankQuestions = useMemo(() => {
    const query = bankSearch.trim().toLowerCase();
    return bankQuestions.filter((question) => {
      if (excludedIds.has(question.questionId)) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        question.questionText.toLowerCase().includes(query) ||
        String(question.questionId).includes(query) ||
        question.questionType.toLowerCase().includes(query)
      );
    });
  }, [bankQuestions, bankSearch, excludedIds]);

  const isMcq = values.questionType.toLowerCase().includes("mcq");
  const showBankTab = !isEdit && Boolean(onAttachFromBank);

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

    if (mode === "bank" && onAttachFromBank) {
      if (!selectedBankQuestionId) {
        setError("Select a question from the bank.");
        return;
      }

      try {
        await onAttachFromBank({
          questionId: selectedBankQuestionId,
          marks: bankMarks === "" ? null : Number(bankMarks),
        });
      } catch (caught) {
        const apiError = caught as ApiError;
        setError(apiError.message || "Unable to attach question.");
      }
      return;
    }

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
      setError(apiError.message || "Unable to save question.");
    }
  }

  const dialogTitle =
    title ?? (isEdit ? "Edit quiz question" : "Add question to quiz");
  const dialogSubmitLabel =
    submitLabel ??
    (mode === "bank"
      ? isSubmitting
        ? "Attaching..."
        : "Attach question"
      : isEdit
        ? isSubmitting
          ? "Saving..."
          : "Save changes"
        : isSubmitting
          ? "Adding..."
          : "Add question");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-slate-900">{dialogTitle}</h2>
        <p className="mt-2 text-sm text-slate-600">
          {isEdit
            ? "Update this question on the quiz."
            : mode === "bank"
              ? "Attach an approved question from the question bank."
              : "Creates a new question and attaches it to this quiz."}
        </p>

        {showBankTab ? (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setMode("create")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                mode === "create"
                  ? "bg-brand-600 text-white"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Create new
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setMode("bank")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                mode === "bank"
                  ? "bg-brand-600 text-white"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              From question bank
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {mode === "bank" && showBankTab ? (
            <>
              <div>
                <label
                  htmlFor="bankSearch"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Search approved questions
                </label>
                <input
                  id="bankSearch"
                  value={bankSearch}
                  disabled={isSubmitting}
                  onChange={(event) => setBankSearch(event.target.value)}
                  className={inputClassName}
                  placeholder="Search by text, type, or ID"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Showing active approved questions
                  {classId || subjectId
                    ? " filtered by this quiz class/subject."
                    : "."}
                </p>
              </div>

              {bankError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {bankError.message}
                </div>
              ) : null}

              <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200">
                {bankLoading ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-600">
                    Loading question bank...
                  </div>
                ) : filteredBankQuestions.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-600">
                    No matching approved questions found.
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {filteredBankQuestions.map((question) => {
                      const selected = selectedBankQuestionId === question.questionId;
                      return (
                        <li key={question.questionId}>
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => {
                              setSelectedBankQuestionId(question.questionId);
                              setBankMarks(question.marks);
                            }}
                            className={`w-full px-4 py-3 text-left transition hover:bg-slate-50 ${
                              selected ? "bg-brand-50" : ""
                            }`}
                          >
                            <p className="text-sm font-medium text-slate-900">
                              #{question.questionId} · {question.questionType}
                            </p>
                            <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                              {question.questionText}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {question.marks} marks
                            </p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <label
                  htmlFor="bankMarks"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Marks override (optional)
                </label>
                <input
                  id="bankMarks"
                  type="number"
                  value={bankMarks}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    setBankMarks(
                      event.target.value === "" ? "" : Number(event.target.value),
                    )
                  }
                  className={inputClassName}
                  min={1}
                  placeholder="Use bank marks"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label
                  htmlFor="questionText"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
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
                  <label
                    htmlFor="questionType"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
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
                  <label
                    htmlFor="marks"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
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
            </>
          )}

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
              {dialogSubmitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
