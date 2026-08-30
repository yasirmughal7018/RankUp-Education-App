import {
  isMatchingType,
  isMultipleChoiceType,
  isOrderingType,
  isSingleChoiceType,
  isTrueFalseType,
  normalizeQuestionType,
} from "@/features/questions/domain/questionTypes";
import type { QuizAnswerDisplayInput } from "@/features/quizzes/domain/quizAnswerDisplayTypes";
import { cn } from "@/lib/utils";

function resolveSelectedIds(question: QuizAnswerDisplayInput): number[] {
  if (question.selectedOptionIds && question.selectedOptionIds.length > 0) {
    return question.selectedOptionIds.filter((id) => id > 0);
  }
  if (question.selectedOptionId != null && question.selectedOptionId > 0) {
    return [question.selectedOptionId];
  }
  return [];
}

function optionLabel(
  options: QuizAnswerDisplayInput["options"],
  optionId: number | null | undefined,
): string {
  if (optionId == null || optionId <= 0) {
    return "—";
  }
  const match = options?.find((option) => option.id === optionId);
  return match?.text?.trim() || `Option #${optionId}`;
}

function optionLetter(index: number): string {
  return String.fromCharCode(65 + (index % 26));
}

function FieldLabel({ children }: { children: string }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </p>
  );
}

function MatchingAnswerPanel({
  question,
  showCorrectAnswers,
  selectedMatchLabel,
}: {
  question: QuizAnswerDisplayInput;
  showCorrectAnswers: boolean;
  selectedMatchLabel: string;
}) {
  const options = question.options ?? [];
  const half = Math.floor(options.length / 2);
  if (half === 0) {
    return null;
  }

  const lefts = options.slice(0, half);
  const rights = options.slice(half);
  const selectedIds = resolveSelectedIds(question);

  return (
    <ul className="space-y-2.5">
      {lefts.map((left, index) => {
        const selectedId = selectedIds[index] ?? null;
        const correctRight = rights[index];
        const pairCorrect =
          showCorrectAnswers &&
          selectedId != null &&
          selectedId === correctRight?.id;

        return (
          <li
            key={`${left.id}-${correctRight?.id ?? index}`}
            className={cn(
              "rounded-xl border px-4 py-3",
              showCorrectAnswers
                ? pairCorrect
                  ? "border-[hsl(var(--success))]/35 bg-[hsl(var(--success-light))]"
                  : "border-destructive/35 bg-[hsl(var(--destructive-light))]"
                : "border-border/80 bg-muted/30",
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pair {index + 1}
            </p>
            <div className="mt-1.5 space-y-1 text-sm text-foreground">
              <p>
                <span className="font-medium text-muted-foreground">Left:</span>{" "}
                {left.text.trim() || "—"}
              </p>
              <p>
                <span className="font-medium text-muted-foreground">
                  {selectedMatchLabel}:
                </span>{" "}
                {optionLabel(options, selectedId)}
              </p>
              {showCorrectAnswers ? (
                <p className="text-[hsl(var(--success))]">
                  <span className="font-medium">Correct:</span>{" "}
                  {correctRight?.text.trim() || "—"}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function OrderingAnswerPanel({
  question,
  showCorrectAnswers,
  yourOrderLabel,
}: {
  question: QuizAnswerDisplayInput;
  showCorrectAnswers: boolean;
  yourOrderLabel: string;
}) {
  const options = question.options ?? [];
  const selectedIds = resolveSelectedIds(question);
  const byId = new Map(options.map((option) => [option.id, option]));

  if (selectedIds.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No order submitted.</p>
    );
  }

  return (
    <div
      className={
        showCorrectAnswers ? "grid gap-3 md:grid-cols-2" : "space-y-2"
      }
    >
      <div>
        <FieldLabel>{yourOrderLabel}</FieldLabel>
        <ol className="space-y-2 text-sm text-foreground">
          {selectedIds.map((optionId, index) => {
            const correctId = options[index]?.id;
            const isPositionCorrect =
              showCorrectAnswers && optionId === correctId;
            return (
              <li
                key={`student-${optionId}-${index}`}
                className={cn(
                  "flex items-start gap-2 rounded-xl border px-3 py-2",
                  showCorrectAnswers
                    ? isPositionCorrect
                      ? "border-[hsl(var(--success))]/35 bg-[hsl(var(--success-light))]"
                      : "border-destructive/35 bg-[hsl(var(--destructive-light))]"
                    : "border-border/80 bg-muted/30",
                )}
              >
                <span className="shrink-0 font-semibold text-muted-foreground">
                  {index + 1}.
                </span>
                <span className="min-w-0">
                  {byId.get(optionId)?.text.trim() || `Option #${optionId}`}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      {showCorrectAnswers ? (
        <div>
          <FieldLabel>Correct order</FieldLabel>
          <ol className="space-y-2 text-sm text-foreground">
            {options.map((option, index) => (
              <li
                key={`correct-${option.id}`}
                className="flex items-start gap-2 rounded-xl border border-[hsl(var(--success))]/35 bg-[hsl(var(--success-light))] px-3 py-2"
              >
                <span className="shrink-0 font-semibold text-[hsl(var(--success))]">
                  {index + 1}.
                </span>
                <span className="min-w-0">{option.text.trim() || "—"}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

function ChoiceOptionCards({
  question,
  showCorrectAnswers,
}: {
  question: QuizAnswerDisplayInput;
  showCorrectAnswers: boolean;
}) {
  const options = question.options ?? [];
  const selectedIds = resolveSelectedIds(question);

  return (
    <div className="space-y-2.5">
      {options.map((option, optionIndex) => {
        const selected = selectedIds.includes(option.id);
        const isCorrect = Boolean(showCorrectAnswers && option.isCorrect);
        const wrongSelected = Boolean(
          showCorrectAnswers && selected && !option.isCorrect,
        );

        const statusLabel = showCorrectAnswers
          ? isCorrect && selected
            ? "Your Answer - Correct"
            : isCorrect
              ? "Correct Answer"
              : wrongSelected
                ? "Your Answer - Wrong"
                : null
          : selected
            ? "Your Answer"
            : null;

        return (
          <div
            key={option.id}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3.5",
              isCorrect &&
                "border-[hsl(var(--success))]/40 bg-[hsl(var(--success-light))]",
              wrongSelected &&
                "border-destructive/40 bg-[hsl(var(--destructive-light))]",
              selected &&
                !showCorrectAnswers &&
                "border-primary/40 bg-primary/10 ring-2 ring-primary/15",
              !selected &&
                !isCorrect &&
                "border-border/80 bg-card",
            )}
          >
            <span
              className={cn(
                "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                isCorrect
                  ? "bg-[hsl(var(--success))] text-white"
                  : wrongSelected
                    ? "bg-destructive text-destructive-foreground"
                    : selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
              )}
            >
              {optionLetter(optionIndex)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-6 text-foreground">
                {option.text}
              </p>
              {option.imageUrl ? (
                <img
                  src={option.imageUrl}
                  alt=""
                  className="mt-2 max-h-40 rounded-xl border border-border object-contain"
                />
              ) : null}
            </div>
            {statusLabel ? (
              <p
                className={cn(
                  "shrink-0 whitespace-nowrap text-right text-xs font-semibold",
                  isCorrect
                    ? "text-[hsl(var(--success))]"
                    : wrongSelected
                      ? "text-destructive"
                      : "text-primary",
                )}
              >
                {statusLabel}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

interface QuizAnswerDisplayProps {
  question: QuizAnswerDisplayInput;
  answerLabel: string;
  showCorrectAnswers?: boolean;
  /** Matching row label for the student's pick (default: "Matched"). */
  selectedMatchLabel?: string;
  /** Ordering column label for the student's sequence (default: "Your order"). */
  yourOrderLabel?: string;
  className?: string;
}

/** Type-aware student answer block for quiz review and result screens. */
export function QuizAnswerDisplay({
  question,
  answerLabel,
  showCorrectAnswers = true,
  selectedMatchLabel = "Matched",
  yourOrderLabel = "Your order",
  className,
}: QuizAnswerDisplayProps) {
  const type = normalizeQuestionType(question.questionType);
  const selectedIds = resolveSelectedIds(question);
  const hasOptions = (question.options?.length ?? 0) > 0;

  if (question.submittedText?.trim()) {
    return (
      <div className={cn("text-sm text-foreground", className)}>
        <FieldLabel>{answerLabel}</FieldLabel>
        <p className="whitespace-pre-wrap rounded-xl border border-border/80 bg-muted/30 px-4 py-3 leading-6">
          {question.submittedText.trim()}
        </p>
      </div>
    );
  }

  if (isMatchingType(type) && hasOptions) {
    return (
      <div className={className}>
        <FieldLabel>{answerLabel}</FieldLabel>
        <MatchingAnswerPanel
          question={question}
          showCorrectAnswers={showCorrectAnswers}
          selectedMatchLabel={selectedMatchLabel}
        />
      </div>
    );
  }

  if (isOrderingType(type) && hasOptions) {
    return (
      <div className={className}>
        <FieldLabel>{answerLabel}</FieldLabel>
        <OrderingAnswerPanel
          question={question}
          showCorrectAnswers={showCorrectAnswers}
          yourOrderLabel={yourOrderLabel}
        />
      </div>
    );
  }

  if (
    hasOptions &&
    (isMultipleChoiceType(type) ||
      isSingleChoiceType(type) ||
      isTrueFalseType(type))
  ) {
    return (
      <div className={className}>
        <FieldLabel>{answerLabel}</FieldLabel>
        <ChoiceOptionCards
          question={question}
          showCorrectAnswers={showCorrectAnswers}
        />
      </div>
    );
  }

  if (selectedIds.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        No answer recorded.
      </p>
    );
  }

  return (
    <div className={cn("text-sm text-foreground", className)}>
      <FieldLabel>{answerLabel}</FieldLabel>
      <p className="rounded-xl border border-border/80 bg-muted/30 px-4 py-3">
        Selected option id{selectedIds.length === 1 ? "" : "s"}:{" "}
        {selectedIds.join(", ")}
      </p>
    </div>
  );
}
