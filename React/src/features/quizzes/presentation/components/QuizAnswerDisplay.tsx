import {
  isMatchingType,
  isMultipleChoiceType,
  isOrderingType,
  isSingleChoiceType,
  isTrueFalseType,
  normalizeQuestionType,
} from "@/features/questions/domain/questionTypes";
import type { QuizAnswerDisplayInput } from "@/features/quizzes/domain/quizAnswerDisplayTypes";

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
    <ul className="space-y-2">
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
            className={
              showCorrectAnswers
                ? pairCorrect
                  ? "rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2.5"
                  : "rounded-lg border border-red-200 bg-red-50/60 px-3 py-2.5"
                : "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
            }
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Pair {index + 1}
            </p>
            <div className="mt-1 space-y-1 text-sm text-slate-800">
              <p>
                <span className="font-medium text-slate-600">Left:</span>{" "}
                {left.text.trim() || "—"}
              </p>
              <p>
                <span className="font-medium text-slate-600">{selectedMatchLabel}:</span>{" "}
                {optionLabel(options, selectedId)}
              </p>
              {showCorrectAnswers ? (
                <p className="text-emerald-800">
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
    return <p className="text-sm text-slate-500">No order submitted.</p>;
  }

  return (
    <div
      className={
        showCorrectAnswers ? "grid gap-3 md:grid-cols-2" : "space-y-2"
      }
    >
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {yourOrderLabel}
        </p>
        <ol className="space-y-1.5 text-sm text-slate-800">
          {selectedIds.map((optionId, index) => {
            const correctId = options[index]?.id;
            const isPositionCorrect =
              showCorrectAnswers && optionId === correctId;
            return (
              <li
                key={`student-${optionId}-${index}`}
                className={`flex items-start gap-2 rounded-md px-2 py-1.5 ${
                  showCorrectAnswers
                    ? isPositionCorrect
                      ? "bg-emerald-50"
                      : "bg-red-50"
                    : "bg-slate-100"
                }`}
              >
                <span className="shrink-0 font-semibold text-slate-500">
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
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Correct order
          </p>
          <ol className="space-y-1.5 text-sm text-emerald-900">
            {options.map((option, index) => (
              <li
                key={`correct-${option.id}`}
                className="flex items-start gap-2 rounded-md bg-emerald-50/80 px-2 py-1.5"
              >
                <span className="shrink-0 font-semibold text-emerald-700">
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

function McqCorrectPanel({
  question,
}: {
  question: QuizAnswerDisplayInput;
}) {
  const options = question.options ?? [];
  const correct = options.filter((option) => option.isCorrect);
  if (correct.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50/80 px-3 py-2">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
        Correct answer{correct.length === 1 ? "" : "s"}
      </p>
      <ul className="space-y-1 text-sm text-emerald-900">
        {correct.map((option) => (
          <li key={option.id}>{option.text.trim() || "—"}</li>
        ))}
      </ul>
    </div>
  );
}

function SelectedOptionsList({
  question,
  selectedIds,
}: {
  question: QuizAnswerDisplayInput;
  selectedIds: number[];
}) {
  const options = question.options ?? [];

  return (
    <ul className="space-y-1 text-sm text-slate-800">
      {selectedIds.map((optionId) => {
        const option = options.find((item) => item.id === optionId);
        return (
          <li key={optionId} className="rounded-md bg-slate-100 px-2 py-1.5">
            {option?.text.trim() || `Option #${optionId}`}
          </li>
        );
      })}
    </ul>
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
  className = "rounded-lg bg-slate-50 px-4 py-3",
}: QuizAnswerDisplayProps) {
  const type = normalizeQuestionType(question.questionType);
  const selectedIds = resolveSelectedIds(question);
  const hasOptions = (question.options?.length ?? 0) > 0;

  if (question.submittedText?.trim()) {
    return (
      <div className={`${className} text-sm text-slate-700`}>
        <p className="mb-1 text-xs font-medium uppercase text-slate-500">
          {answerLabel}
        </p>
        <p className="whitespace-pre-wrap">{question.submittedText.trim()}</p>
      </div>
    );
  }

  if (isMatchingType(type) && hasOptions) {
    return (
      <div className={className}>
        <p className="mb-2 text-xs font-medium uppercase text-slate-500">
          {answerLabel}
        </p>
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
        <p className="mb-2 text-xs font-medium uppercase text-slate-500">
          {answerLabel}
        </p>
        <OrderingAnswerPanel
          question={question}
          showCorrectAnswers={showCorrectAnswers}
          yourOrderLabel={yourOrderLabel}
        />
      </div>
    );
  }

  if (selectedIds.length === 0) {
    return null;
  }

  if (
    hasOptions &&
    (isMultipleChoiceType(type) ||
      isSingleChoiceType(type) ||
      isTrueFalseType(type))
  ) {
    return (
      <div className={className}>
        <p className="mb-2 text-xs font-medium uppercase text-slate-500">
          {answerLabel}
        </p>
        {selectedIds.length === 1 ? (
          <p className="text-sm text-slate-800">
            {optionLabel(question.options, selectedIds[0])}
          </p>
        ) : (
          <SelectedOptionsList question={question} selectedIds={selectedIds} />
        )}
        {showCorrectAnswers ? <McqCorrectPanel question={question} /> : null}
      </div>
    );
  }

  return (
    <div className={`${className} text-sm text-slate-700`}>
      <p className="mb-1 text-xs font-medium uppercase text-slate-500">
        {answerLabel}
      </p>
      <p>
        Selected option id{selectedIds.length === 1 ? "" : "s"}:{" "}
        {selectedIds.join(", ")}
      </p>
    </div>
  );
}
