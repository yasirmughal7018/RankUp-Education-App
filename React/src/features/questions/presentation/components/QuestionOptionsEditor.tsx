import type { QuestionOptionInput } from "@/features/questions/domain/questionTypes";
import {
  isFillBlankType,
  isMultipleChoiceType,
  isSingleChoiceType,
  isTrueFalseType,
  normalizeQuestionType,
} from "@/features/questions/domain/questionTypes";
import { RequiredMark } from "@/core/components/RequiredMark";

interface QuestionOptionsEditorProps {
  questionType: string;
  options: QuestionOptionInput[];
  disabled?: boolean;
  onChange: (options: QuestionOptionInput[]) => void;
}

const inputClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

/** Editable answer options for MCQ, true/false, and fill-in-the-blank types. */
export function QuestionOptionsEditor({
  questionType,
  options,
  disabled = false,
  onChange,
}: QuestionOptionsEditorProps) {
  const type = normalizeQuestionType(questionType);
  const singleSelect = isSingleChoiceType(type) || isTrueFalseType(type);
  const multiSelect = isMultipleChoiceType(type);
  const fillBlank = isFillBlankType(type);
  const trueFalse = isTrueFalseType(type);

  function updateOption(index: number, patch: Partial<QuestionOptionInput>) {
    if (patch.isCorrect === true && singleSelect) {
      onChange(
        options.map((option, currentIndex) => ({
          ...option,
          ...(currentIndex === index ? patch : { isCorrect: false }),
        })),
      );
      return;
    }

    onChange(
      options.map((option, currentIndex) =>
        currentIndex === index ? { ...option, ...patch } : option,
      ),
    );
  }

  function addOption() {
    onChange([
      ...options,
      { optionText: "", isCorrect: fillBlank ? true : false },
    ]);
  }

  function removeOption(index: number) {
    const minCount = fillBlank ? 1 : 2;
    if (options.length <= minCount) {
      return;
    }
    onChange(options.filter((_, currentIndex) => currentIndex !== index));
  }

  const title = fillBlank
    ? "Accepted answers"
    : trueFalse
      ? "True / False"
      : "Answer options";

  const helper = fillBlank
    ? "Students type an answer. Add every accepted spelling or wording."
    : singleSelect
      ? "Students can select only one option. Mark exactly one as correct."
      : "Students can select multiple options. Mark every correct option.";

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {title} <RequiredMark />
          </h3>
          <p className="mt-1 text-xs text-slate-500">{helper}</p>
        </div>
        {!trueFalse ? (
          <button
            type="button"
            disabled={disabled}
            onClick={addOption}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-70"
          >
            {fillBlank ? "Add accepted answer" : "Add option"}
          </button>
        ) : null}
      </div>

      <div className="space-y-3">
        {options.map((option, index) => (
          <div
            key={`option-${index}`}
            className={`grid gap-3 rounded-2xl border p-4 transition ${
              option.isCorrect
                ? "border-emerald-300 bg-emerald-50/70"
                : "border-slate-200 bg-white"
            } ${trueFalse ? "md:grid-cols-[1fr_auto]" : "md:grid-cols-[1fr_auto_auto]"}`}
          >
            {trueFalse ? (
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                  {option.optionText.slice(0, 1) || "?"}
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {option.optionText}
                </span>
              </div>
            ) : (
              <input
                type="text"
                value={option.optionText}
                disabled={disabled}
                onChange={(event) =>
                  updateOption(index, { optionText: event.target.value })
                }
                className={inputClassName}
                placeholder={
                  fillBlank
                    ? `Accepted answer ${index + 1}`
                    : `Option ${String.fromCharCode(65 + index)}`
                }
              />
            )}

            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type={singleSelect ? "radio" : "checkbox"}
                name={singleSelect ? "correct-option" : undefined}
                checked={option.isCorrect}
                disabled={disabled || (fillBlank && true)}
                onChange={(event) =>
                  updateOption(index, {
                    isCorrect: singleSelect ? true : event.target.checked,
                  })
                }
                className="h-4 w-4 accent-brand-600"
              />
              {fillBlank ? "Accepted" : multiSelect ? "Correct" : "Correct"}
            </label>

            {!trueFalse ? (
              <button
                type="button"
                disabled={disabled || options.length <= (fillBlank ? 1 : 2)}
                onClick={() => removeOption(index)}
                className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
