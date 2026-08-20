import {
  isMatchingType,
  isOrderingType,
  matchingPairCount,
  normalizeQuestionType,
  type QuestionOption,
} from "@/features/questions/domain/questionTypes";
import { StatusBadge } from "@/features/questions/presentation/components/StatusBadge";

interface QuestionDetailOptionsProps {
  questionType: string;
  options: QuestionOption[];
}

function McqOptionList({ options }: { options: QuestionOption[] }) {
  return (
    <ul className="space-y-2">
      {options.map((option) => (
        <li
          key={option.optionId}
          className={
            option.isCorrect
              ? "flex items-center justify-between gap-3 rounded-lg border border-[var(--status-approved-border)] bg-[var(--status-approved-bg)] px-4 py-3 text-sm text-[var(--status-approved-text)]"
              : "flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground"
          }
        >
          <span className="min-w-0 flex-1">
            <span className="block">{option.optionText || "Image option"}</span>
            {option.optionImageUrl ? (
              <img
                src={option.optionImageUrl}
                alt=""
                className="mt-2 max-h-32 rounded-lg border border-border object-contain"
              />
            ) : null}
          </span>
          {option.isCorrect ? (
            <StatusBadge label="Correct" status="approved" />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function MatchingPairsList({ options }: { options: QuestionOption[] }) {
  const pairCount = matchingPairCount(options);

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Matching pairs</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Each row is one correct pair (left ↔ right).
        </p>
      </div>
      <div className="space-y-2.5 sm:space-y-3">
        {Array.from({ length: pairCount }, (_, pairIndex) => {
          const left = options[pairIndex];
          const right = options[pairCount + pairIndex];
          if (!left || !right) {
            return null;
          }

          return (
            <div
              key={`pair-${left.optionId}-${right.optionId}`}
              className="rounded-2xl border border-[var(--status-approved-border)] bg-[var(--status-approved-bg)]/70 p-3 sm:p-4"
            >
              <div className="mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--status-approved-text)]">
                  Pair {pairIndex + 1}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full bg-background/80 px-2 text-[11px] font-semibold text-muted-foreground">
                    L{pairIndex + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                    {left.optionText || "—"}
                  </span>
                </div>
                <span
                  className="hidden text-center text-xs font-semibold text-muted-foreground sm:block"
                  aria-hidden
                >
                  ↔
                </span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full bg-background/80 px-2 text-[11px] font-semibold text-muted-foreground">
                    R{pairIndex + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                    {right.optionText || "—"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderingList({ options }: { options: QuestionOption[] }) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Correct order</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Items listed top-to-bottom in the correct sequence.
        </p>
      </div>
      <ul className="space-y-2.5 sm:space-y-3">
        {options.map((option, index) => (
          <li
            key={option.optionId}
            className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-3 sm:gap-3 sm:px-4"
          >
            <span className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full bg-muted px-2 text-[11px] font-semibold text-muted-foreground">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 text-sm text-foreground">
              {option.optionText || "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Read-only answer options on question detail, styled per question type. */
export function QuestionDetailOptions({
  questionType,
  options,
}: QuestionDetailOptionsProps) {
  if (options.length === 0) {
    return null;
  }

  const type = normalizeQuestionType(questionType);

  if (isMatchingType(type)) {
    return <MatchingPairsList options={options} />;
  }

  if (isOrderingType(type)) {
    return <OrderingList options={options} />;
  }

  return <McqOptionList options={options} />;
}
