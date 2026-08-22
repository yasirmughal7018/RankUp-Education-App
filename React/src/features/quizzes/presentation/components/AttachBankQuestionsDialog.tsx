import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { useLookups } from "@/core/hooks/useLookups";
import { LOOKUP_TYPES } from "@/core/lookups/lookupTypes";
import type { QuestionSummary } from "@/features/questions/domain/questionTypes";
import { useQuestionsQuery } from "@/features/questions/presentation/hooks/useQuestionQueries";
import type { AttachBankQuestionInput } from "@/features/quizzes/domain/quizTypes";
import { formatQuizDuration } from "@/features/quizzes/domain/quizTypes";
import {
  parseAnswerPreview,
  QuizQuestionAnswerAside,
} from "@/features/quizzes/presentation/components/QuizQuestionAnswerAside";

interface AttachBankQuestionsDialogProps {
  isSubmitting: boolean;
  subjectId?: number;
  /** Quiz class/grade — used as the default bank filter when set. */
  classId?: number;
  excludeQuestionIds?: number[];
  onClose: () => void;
  onAttach: (inputs: AttachBankQuestionInput[]) => Promise<void>;
}

function resolveEstimatedTimeSeconds(
  question: QuestionSummary & { EstimatedTimeSeconds?: number },
): number {
  const value = question.estimatedTimeSeconds ?? question.EstimatedTimeSeconds;
  return typeof value === "number" && value > 0 ? value : 0;
}

/** Attach one or more Public + Active bank questions to a quiz. */
export function AttachBankQuestionsDialog({
  isSubmitting,
  subjectId,
  classId,
  excludeQuestionIds = [],
  onClose,
  onAttach,
}: AttachBankQuestionsDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [bankSearch, setBankSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<number | "">(() =>
    classId && classId > 0 ? classId : "",
  );
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [difficultyFilter, setDifficultyFilter] = useState<number | "">("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());

  const { data: subjects = [] } = useLookups(LOOKUP_TYPES.SUBJECT);
  const { data: classes = [] } = useLookups(LOOKUP_TYPES.CLASS);
  const { data: difficulties = [] } = useLookups(LOOKUP_TYPES.DIFFICULTY);
  const { data: questionTypes = [] } = useLookups(LOOKUP_TYPES.QUESTION_TYPE);

  const subjectNameById = useMemo(
    () => new Map(subjects.map((item) => [item.id, item.name])),
    [subjects],
  );
  const classNameById = useMemo(
    () => new Map(classes.map((item) => [item.id, item.name])),
    [classes],
  );
  const difficultyNameById = useMemo(
    () => new Map(difficulties.map((item) => [item.id, item.name])),
    [difficulties],
  );

  const bankFilters = useMemo(
    () => ({
      pendingOnly: false,
      activeFilter: "true" as const,
      subjectId: subjectId && subjectId > 0 ? subjectId : ("" as const),
      classId: gradeFilter === "" ? ("" as const) : gradeFilter,
      eligibleForQuizOnly: true,
    }),
    [gradeFilter, subjectId],
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
      if (typeFilter && question.questionType !== typeFilter) {
        return false;
      }
      if (
        difficultyFilter !== "" &&
        question.difficultyLevel !== difficultyFilter
      ) {
        return false;
      }
      if (!query) {
        return true;
      }

      const subjectName = subjectNameById.get(question.subjectId) ?? "";
      const className = classNameById.get(question.classId) ?? "";
      const difficultyName =
        difficultyNameById.get(question.difficultyLevel) ?? "";

      return (
        question.questionText.toLowerCase().includes(query) ||
        String(question.questionId).includes(query) ||
        question.questionType.toLowerCase().includes(query) ||
        subjectName.toLowerCase().includes(query) ||
        className.toLowerCase().includes(query) ||
        difficultyName.toLowerCase().includes(query)
      );
    });
  }, [
    bankQuestions,
    bankSearch,
    classNameById,
    difficultyFilter,
    difficultyNameById,
    excludedIds,
    subjectNameById,
    typeFilter,
  ]);

  const selectedQuestions = useMemo(
    () =>
      bankQuestions.filter((question) => selectedIds.has(question.questionId)),
    [bankQuestions, selectedIds],
  );

  const selectionTotals = useMemo(() => {
    const totalMarks = selectedQuestions.reduce(
      (sum, question) => sum + Math.max(0, question.marks),
      0,
    );
    const totalSeconds = selectedQuestions.reduce(
      (sum, question) => sum + resolveEstimatedTimeSeconds(question),
      0,
    );
    return {
      count: selectedQuestions.length,
      marks: totalMarks,
      timeLabel: formatQuizDuration(totalSeconds),
    };
  }, [selectedQuestions]);

  const allVisibleSelected =
    filteredBankQuestions.length > 0 &&
    filteredBankQuestions.every((question) =>
      selectedIds.has(question.questionId),
    );

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isSubmitting, onClose]);

  function toggleQuestion(questionId: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        for (const question of filteredBankQuestions) {
          next.delete(question.questionId);
        }
      } else {
        for (const question of filteredBankQuestions) {
          next.add(question.questionId);
        }
      }
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (selectedIds.size === 0) {
      setError("Select at least one bank question.");
      return;
    }

    const byId = new Map(
      bankQuestions.map((question) => [question.questionId, question]),
    );
    const inputs: AttachBankQuestionInput[] = [];
    for (const questionId of selectedIds) {
      const question = byId.get(questionId);
      if (!question) {
        continue;
      }
      inputs.push({ questionId, marks: question.marks });
    }

    if (inputs.length === 0) {
      setError("Select at least one bank question.");
      return;
    }

    try {
      await onAttach(inputs);
    } catch (caught) {
      const apiError = caught as { message?: string };
      setError(apiError.message || "Unable to attach bank questions.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-3 py-6 sm:px-6">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <header className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-slate-900">
                Add from question bank
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Select quiz-ready Public questions
                {subjectId && gradeFilter !== ""
                  ? " for this quiz's subject and grade."
                  : subjectId
                    ? " for this quiz's subject."
                    : gradeFilter !== ""
                      ? " for the selected grade."
                      : "."}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[320px]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Questions
                </p>
                <p className="mt-0.5 text-lg font-semibold text-slate-900">
                  {selectionTotals.count}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Marks
                </p>
                <p className="mt-0.5 text-lg font-semibold text-slate-900">
                  {selectionTotals.marks}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Time
                </p>
                <p className="mt-0.5 text-lg font-semibold text-slate-900">
                  {selectionTotals.timeLabel}
                </p>
              </div>
            </div>
          </div>
        </header>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="space-y-3 border-b border-slate-200 px-5 py-4 sm:px-6">
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            {bankError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {bankError.message}
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.75fr))_auto]">
              <AppSearchInput
                value={bankSearch}
                disabled={isSubmitting}
                onChange={(event) => setBankSearch(event.target.value)}
                placeholder="Search questions…"
                aria-label="Search bank questions"
              />
              <select
                value={gradeFilter === "" ? "" : String(gradeFilter)}
                disabled={isSubmitting}
                onChange={(event) =>
                  setGradeFilter(
                    event.target.value === ""
                      ? ""
                      : Number(event.target.value),
                  )
                }
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
                aria-label="Filter by grade"
              >
                <option value="">All grades</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select
                value={typeFilter}
                disabled={isSubmitting}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
                aria-label="Filter by type"
              >
                <option value="">All types</option>
                {questionTypes.map((type) => (
                  <option key={type.id} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </select>
              <select
                value={difficultyFilter === "" ? "" : String(difficultyFilter)}
                disabled={isSubmitting}
                onChange={(event) =>
                  setDifficultyFilter(
                    event.target.value === ""
                      ? ""
                      : Number(event.target.value),
                  )
                }
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
                aria-label="Filter by difficulty"
              >
                <option value="">All difficulties</option>
                {difficulties.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={isSubmitting || filteredBankQuestions.length === 0}
                onClick={toggleAllVisible}
                className="h-10 whitespace-nowrap rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {allVisibleSelected ? "Clear visible" : "Select all"}
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 sm:px-6">
              <p className="text-sm font-medium text-slate-900">
                {filteredBankQuestions.length} question
                {filteredBankQuestions.length === 1 ? "" : "s"}
              </p>
            </div>

            {bankLoading ? (
              <div className="px-5 py-16 text-center text-sm text-slate-600 sm:px-6">
                Loading question bank...
              </div>
            ) : filteredBankQuestions.length === 0 ? (
              <div className="px-5 py-16 text-center text-sm text-slate-600 sm:px-6">
                No matching eligible questions found. Create or publish questions
                in the Question Bank, then return here to attach them.
              </div>
            ) : (
              <div>
                <div className="hidden border-b border-slate-200 bg-slate-50 px-5 py-2.5 sm:flex sm:gap-3 sm:px-6">
                  <span className="w-4 shrink-0" aria-hidden />
                  <div className="grid min-w-0 flex-1 grid-cols-6 gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Subject
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Class
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Difficulty
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Type
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Marks
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Time sec
                    </p>
                  </div>
                </div>

                <ul className="divide-y divide-slate-200">
                  {filteredBankQuestions.map((question) => {
                    const selected = selectedIds.has(question.questionId);
                    const timeSeconds = resolveEstimatedTimeSeconds(question);
                    const timeLabel =
                      timeSeconds > 0 ? `${timeSeconds} sec` : "—";
                    const answerPreview =
                      question.correctAnswerPreview ??
                      (
                        question as QuestionSummary & {
                          CorrectAnswerPreview?: string;
                        }
                      ).CorrectAnswerPreview;
                    const answers = parseAnswerPreview(answerPreview);

                    return (
                      <li key={question.questionId}>
                        <div
                          className={`flex gap-3 px-5 py-3.5 transition hover:bg-slate-50 sm:px-6 ${
                            selected ? "bg-brand-50/50" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 shrink-0 cursor-pointer"
                            checked={selected}
                            disabled={isSubmitting}
                            onChange={() =>
                              toggleQuestion(question.questionId)
                            }
                            aria-label={`Select question ${question.questionId}`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                className="min-w-0 flex-1 cursor-pointer truncate text-left text-sm font-semibold text-slate-900"
                                title={question.questionText}
                                disabled={isSubmitting}
                                onClick={() =>
                                  toggleQuestion(question.questionId)
                                }
                              >
                                {question.questionText}
                              </button>
                              <QuizQuestionAnswerAside
                                questionType={question.questionType}
                                answers={answers}
                              />
                            </div>

                            <div className="mt-2 grid grid-cols-2 items-center gap-x-3 gap-y-1.5 text-xs text-slate-500 sm:grid-cols-6">
                              <p className="min-w-0 truncate font-medium text-slate-900">
                                {subjectNameById.get(question.subjectId) ??
                                  "Unknown subject"}
                              </p>
                              <p className="min-w-0 truncate">
                                {classNameById.get(question.classId) ??
                                  "Unknown class"}
                              </p>
                              <p className="min-w-0 truncate">
                                {difficultyNameById.get(
                                  question.difficultyLevel,
                                ) ?? "Unknown"}
                              </p>
                              <p className="min-w-0 truncate">
                                {question.questionType}
                              </p>
                              <p className="min-w-0 truncate tabular-nums sm:hidden">
                                {question.marks} / {timeLabel}
                              </p>
                              <p className="hidden min-w-0 truncate tabular-nums sm:block">
                                {question.marks}
                              </p>
                              <p className="hidden min-w-0 truncate tabular-nums sm:block">
                                {timeLabel}
                              </p>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm text-slate-600">
              {selectedIds.size > 0
                ? `${selectedIds.size} selected`
                : "Select one or more questions"}
            </p>
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
                disabled={isSubmitting || selectedIds.size === 0}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting
                  ? "Attaching..."
                  : selectedIds.size <= 1
                    ? "Attach question"
                    : `Attach ${selectedIds.size} questions`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
