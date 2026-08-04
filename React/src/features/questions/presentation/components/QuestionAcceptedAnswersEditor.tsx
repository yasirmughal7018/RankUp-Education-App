import { Trash2 } from "lucide-react";
import {
  createEmptyAcceptedAnswer,
  type QuestionAcceptedAnswerInput,
} from "@/features/questions/domain/questionTypes";
import { RequiredMark } from "@/core/components/RequiredMark";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";
import { cn } from "@/lib/utils";

interface QuestionAcceptedAnswersEditorProps {
  answers: QuestionAcceptedAnswerInput[];
  disabled?: boolean;
  onChange: (answers: QuestionAcceptedAnswerInput[]) => void;
}

const inputClassName = FORM_FIELD_CLASS;

/** Editable accepted-answer list for short-answer and numeric question types. */
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
    <section className="space-y-4 rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            Accepted answers <RequiredMark />
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Students type an answer. These model answers are hidden until after
            they submit. Optional AI / teacher review flags apply on attempts.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={addAnswer}
          className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted disabled:opacity-70"
        >
          Add accepted answer
        </button>
      </div>

      <div className="space-y-3">
        {answers.map((answer, index) => {
          const canRemove = !disabled && answers.length > 1;

          return (
            <div
              key={`accepted-${index}`}
              className="space-y-3 rounded-2xl border border-[var(--status-approved-border)]/40 bg-[var(--status-approved-bg)]/50 p-3 sm:p-4"
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={answer.answerText}
                  disabled={disabled}
                  onChange={(event) =>
                    updateAnswer(index, { answerText: event.target.value })
                  }
                  className={cn(inputClassName, "min-w-0 flex-1")}
                  placeholder={`Accepted answer ${index + 1}`}
                />
                <button
                  type="button"
                  disabled={!canRemove}
                  onClick={() => removeAnswer(index)}
                  aria-label={`Remove accepted answer ${index + 1}`}
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

              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-foreground/80">
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
                      updateAnswer(index, {
                        allowAiReview: event.target.checked,
                      })
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

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-muted-foreground">
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
                <label className="text-xs text-muted-foreground">
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
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
