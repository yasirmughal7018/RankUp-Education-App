import { Check, Trash2 } from "lucide-react";
import type { QuestionOptionInput } from "@/features/questions/domain/questionTypes";
import {
  isFillBlankType,
  isSingleChoiceType,
  isTrueFalseType,
  normalizeQuestionType,
} from "@/features/questions/domain/questionTypes";
import { RequiredMark } from "@/core/components/RequiredMark";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";
import { cn } from "@/lib/utils";

interface QuestionOptionsEditorProps {
  questionType: string;
  options: QuestionOptionInput[];
  disabled?: boolean;
  onChange: (options: QuestionOptionInput[]) => void;
}

const inputClassName = FORM_FIELD_CLASS;

function CorrectToggle({
  checked,
  disabled,
  singleSelect,
  onToggle,
  label = "Correct",
}: {
  checked: boolean;
  disabled?: boolean;
  singleSelect: boolean;
  onToggle: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role={singleSelect ? "radio" : "checkbox"}
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onToggle(singleSelect ? true : !checked);
      }}
      className={cn(
        "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "w-9 sm:w-auto sm:px-3",
        checked
          ? "border-[var(--status-approved-border)] bg-[var(--status-approved-border)] text-white shadow-sm"
          : "border-border bg-background text-muted-foreground hover:border-[var(--status-approved-border)] hover:text-[var(--status-approved-text)]",
      )}
    >
      <Check className="h-4 w-4" strokeWidth={2.5} />
      <span className="hidden text-xs font-semibold sm:inline">{label}</span>
    </button>
  );
}

/** Editable answer options for MCQ / True-False; also accepted answers for Fill (quiz inline). */
export function QuestionOptionsEditor({
  questionType,
  options,
  disabled = false,
  onChange,
}: QuestionOptionsEditorProps) {
  const type = normalizeQuestionType(questionType);
  const singleSelect = isSingleChoiceType(type) || isTrueFalseType(type);
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

  const minCount = fillBlank ? 1 : 2;

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            {title} <RequiredMark />
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
        {!trueFalse ? (
          <button
            type="button"
            disabled={disabled}
            onClick={addOption}
            className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted disabled:opacity-70"
          >
            {fillBlank ? "Add accepted answer" : "Add option"}
          </button>
        ) : null}
      </div>

      <div className="space-y-2.5 sm:space-y-3">
        {options.map((option, index) => {
          const canRemove = !disabled && options.length > minCount;

          return (
            <div
              key={`option-${index}`}
              className={cn(
                "rounded-2xl border p-3 transition sm:p-4",
                option.isCorrect
                  ? "border-[var(--status-approved-border)] bg-[var(--status-approved-bg)]/70"
                  : "border-border bg-card",
              )}
            >
              {trueFalse ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                    {option.optionText.slice(0, 1) || "?"}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                    {option.optionText}
                  </span>
                  <CorrectToggle
                    checked={option.isCorrect}
                    disabled={disabled}
                    singleSelect
                    onToggle={() => updateOption(index, { isCorrect: true })}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 sm:gap-3">
                  <input
                    type="text"
                    value={option.optionText}
                    disabled={disabled}
                    onChange={(event) =>
                      updateOption(index, { optionText: event.target.value })
                    }
                    className={cn(inputClassName, "min-w-0 flex-1")}
                    placeholder={
                      fillBlank
                        ? `Accepted answer ${index + 1}`
                        : `Option ${String.fromCharCode(65 + index)}`
                    }
                  />
                  <CorrectToggle
                    checked={option.isCorrect}
                    disabled={disabled || fillBlank}
                    singleSelect={singleSelect}
                    label={fillBlank ? "Accepted" : "Correct"}
                    onToggle={(next) =>
                      updateOption(index, { isCorrect: next })
                    }
                  />
                  <button
                    type="button"
                    disabled={!canRemove}
                    onClick={() => removeOption(index)}
                    aria-label={`Remove option ${index + 1}`}
                    title="Remove"
                    className={cn(
                      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition",
                      "border-[var(--status-rejected-border)]/50 bg-card text-[var(--status-rejected-text)]",
                      "hover:border-[var(--status-rejected-border)] hover:bg-[var(--status-rejected-bg)]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "disabled:cursor-not-allowed disabled:opacity-35",
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
