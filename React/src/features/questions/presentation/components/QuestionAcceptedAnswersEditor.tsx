import {
  createEmptyAcceptedAnswer,
  type QuestionAcceptedAnswerInput,
} from "@/features/questions/domain/questionTypes";
import { RequiredMark } from "@/core/components/RequiredMark";

interface QuestionAcceptedAnswersEditorProps {
  answers: QuestionAcceptedAnswerInput[];
  disabled?: boolean;
  onChange: (answers: QuestionAcceptedAnswerInput[]) => void;
}

const inputClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

export function QuestionAcceptedAnswersEditor({
  answers,
  disabled = false,
  onChange,
}: QuestionAcceptedAnswersEditorProps) {
  function updateAnswer(
    index: number,
    patch: Partial<QuestionAcceptedAnswerInput>,
  ) {
    onChange(
      answers.map((answer, currentIndex) =>
        currentIndex === index ? { ...answer, ...patch } : answer,
      ),
    );
  }

  function addAnswer() {
    onChange([...answers, createEmptyAcceptedAnswer()]);
  }

  function removeAnswer(index: number) {
    if (answers.length <= 1) {
      return;
    }
    onChange(answers.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Accepted answers <RequiredMark />
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Students type an answer. These model answers are hidden until after
            they submit. Optional AI / teacher review flags apply on attempts.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={addAnswer}
          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-70"
        >
          Add accepted answer
        </button>
      </div>

      <div className="space-y-3">
        {answers.map((answer, index) => (
          <div
            key={`accepted-${index}`}
            className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4"
          >
            <input
              type="text"
              value={answer.answerText}
              disabled={disabled}
              onChange={(event) =>
                updateAnswer(index, { answerText: event.target.value })
              }
              className={inputClassName}
              placeholder={`Accepted answer ${index + 1}`}
            />

            <div className="flex flex-wrap gap-4 text-xs text-slate-700">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={answer.isCaseSensitive}
                  disabled={disabled}
                  onChange={(event) =>
                    updateAnswer(index, {
                      isCaseSensitive: event.target.checked,
                    })
                  }
                />
                Case sensitive
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={answer.allowPartialMatch}
                  disabled={disabled}
                  onChange={(event) =>
                    updateAnswer(index, {
                      allowPartialMatch: event.target.checked,
                    })
                  }
                />
                Allow partial match
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={answer.allowAiReview}
                  disabled={disabled}
                  onChange={(event) =>
                    updateAnswer(index, { allowAiReview: event.target.checked })
                  }
                />
                Allow AI review
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={answer.allowTeacherReview}
                  disabled={disabled}
                  onChange={(event) =>
                    updateAnswer(index, {
                      allowTeacherReview: event.target.checked,
                    })
                  }
                />
                Allow teacher review
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <label className="text-xs text-slate-600">
                Min length
                <input
                  type="number"
                  min={0}
                  value={answer.minimumLength}
                  disabled={disabled}
                  onChange={(event) =>
                    updateAnswer(index, {
                      minimumLength: Number(event.target.value) || 0,
                    })
                  }
                  className={`${inputClassName} mt-1`}
                />
              </label>
              <label className="text-xs text-slate-600">
                Max length
                <input
                  type="number"
                  min={1}
                  value={answer.maximumLength}
                  disabled={disabled}
                  onChange={(event) =>
                    updateAnswer(index, {
                      maximumLength: Number(event.target.value) || 1000,
                    })
                  }
                  className={`${inputClassName} mt-1`}
                />
              </label>
              <button
                type="button"
                disabled={disabled || answers.length <= 1}
                onClick={() => removeAnswer(index)}
                className="self-end rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
