import type { QuestionOptionInput } from "@/features/questions/domain/questionTypes";

interface QuestionOptionsEditorProps {
  options: QuestionOptionInput[];
  disabled?: boolean;
  onChange: (options: QuestionOptionInput[]) => void;
}

const inputClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2";

export function QuestionOptionsEditor({
  options,
  disabled = false,
  onChange,
}: QuestionOptionsEditorProps) {
  function updateOption(index: number, patch: Partial<QuestionOptionInput>) {
    onChange(
      options.map((option, currentIndex) =>
        currentIndex === index ? { ...option, ...patch } : option,
      ),
    );
  }

  function addOption() {
    onChange([...options, { optionText: "", isCorrect: false }]);
  }

  function removeOption(index: number) {
    onChange(options.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-900">Answer options</h3>
        <button
          type="button"
          disabled={disabled}
          onClick={addOption}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
        >
          Add option
        </button>
      </div>

      {options.map((option, index) => (
        <div
          key={`option-${index}`}
          className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[1fr_auto_auto]"
        >
          <input
            type="text"
            value={option.optionText}
            disabled={disabled}
            onChange={(event) =>
              updateOption(index, { optionText: event.target.value })
            }
            className={inputClassName}
            placeholder={`Option ${index + 1}`}
          />

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={option.isCorrect}
              disabled={disabled}
              onChange={(event) =>
                updateOption(index, { isCorrect: event.target.checked })
              }
            />
            Correct
          </label>

          <button
            type="button"
            disabled={disabled || options.length <= 2}
            onClick={() => removeOption(index)}
            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-70"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
