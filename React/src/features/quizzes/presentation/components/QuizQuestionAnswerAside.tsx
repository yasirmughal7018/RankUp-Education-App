import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowDownUp, ListChecks, MessageSquareText, Shuffle } from "lucide-react";
import {
  isFillBlankType,
  isMatchingType,
  isMultipleChoiceType,
  isOrderingType,
  isSingleChoiceType,
  isTrueFalseType,
  matchingPairCount,
  normalizeQuestionType,
} from "@/features/questions/domain/questionTypes";
import type { QuizQuestionItem } from "@/features/quizzes/domain/quizTypes";

const FILL_INLINE_MAX_CHARS = 48;

export interface QuizAnswerOption {
  optionText: string;
  isCorrect?: boolean;
}

function collectCorrectAnswers(question: QuizQuestionItem): string[] {
  const fromOptions = question.options
    .filter((option) => option.isCorrect)
    .map((option) => option.optionText.trim())
    .filter((text) => text.length > 0);
  const fromAccepted = (question.acceptedAnswers ?? [])
    .map((answer) => answer.answerText.trim())
    .filter((text) => text.length > 0);
  return [...fromOptions, ...fromAccepted];
}

/** Split bank list preview (`a, b`) into answer parts for display. */
export function parseAnswerPreview(preview: string | null | undefined): string[] {
  const text = preview?.trim() ?? "";
  if (!text) {
    return [];
  }
  return text
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function answersFromQuizQuestion(question: QuizQuestionItem): string[] {
  return collectCorrectAnswers(question);
}

interface AnswerRevealPanelProps {
  count: number;
  ariaLabel: string;
  title: string;
  icon: "list" | "text" | "matching" | "ordering";
  children: ReactNode;
}

function AnswerRevealPanel({
  count,
  ariaLabel,
  title,
  icon,
  children,
}: AnswerRevealPanelProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();
  const Icon =
    icon === "list"
      ? ListChecks
      : icon === "text"
        ? MessageSquareText
        : icon === "matching"
          ? Shuffle
          : ArrowDownUp;

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <span ref={rootRef} className="relative inline-flex shrink-0">
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={panelId}
        title={ariaLabel}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
        <span className="text-[10px] font-semibold tabular-nums">{count}</span>
      </button>
      {open ? (
        <span
          id={panelId}
          role="dialog"
          className="absolute right-0 top-full z-30 mt-1.5 w-72 max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg"
        >
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <div className="max-h-56 overflow-auto">{children}</div>
        </span>
      ) : null}
    </span>
  );
}

function MatchingPairsPanel({ options }: { options: QuizAnswerOption[] }) {
  const pairCount = matchingPairCount(
    options.map((option) => ({
      optionText: option.optionText,
      isCorrect: option.isCorrect ?? false,
    })),
  );

  return (
    <ul className="space-y-2 text-xs text-slate-700">
      {Array.from({ length: pairCount }, (_, pairIndex) => {
        const left = options[pairIndex];
        const right = options[pairCount + pairIndex];
        if (!left || !right) {
          return null;
        }

        return (
          <li
            key={`pair-${pairIndex}`}
            className="rounded-md border border-emerald-200 bg-emerald-50/80 p-2"
          >
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
              Pair {pairIndex + 1}
            </p>
            <div className="space-y-1">
              <p className="flex items-start gap-1.5 leading-snug">
                <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                  L{pairIndex + 1}
                </span>
                <span className="min-w-0">{left.optionText.trim() || "—"}</span>
              </p>
              <p className="flex items-start gap-1.5 leading-snug">
                <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                  R{pairIndex + 1}
                </span>
                <span className="min-w-0">{right.optionText.trim() || "—"}</span>
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function OrderingPanel({ options }: { options: QuizAnswerOption[] }) {
  return (
    <ol className="space-y-1.5 text-xs text-slate-700">
      {options.map((option, index) => (
        <li
          key={`order-${index}-${option.optionText.slice(0, 12)}`}
          className="flex items-start gap-1.5 rounded-md bg-slate-50 px-2 py-1.5 leading-snug"
        >
          <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
            {index + 1}
          </span>
          <span className="min-w-0">{option.optionText.trim() || "—"}</span>
        </li>
      ))}
    </ol>
  );
}

interface QuizQuestionAnswerAsideProps {
  questionType: string;
  answers: string[];
  /** Full option rows — required for matching/ordering pair and order display. */
  options?: QuizAnswerOption[];
}

/**
 * Shows correct answer(s) to the right of question text.
 * Single / True-False: inline. Multiple Choice: click icon. Matching / Ordering: pair or order popup.
 */
export function QuizQuestionAnswerAside({
  questionType,
  answers,
  options = [],
}: QuizQuestionAnswerAsideProps) {
  const type = normalizeQuestionType(questionType);
  const filledOptions = options.filter((option) => option.optionText.trim().length > 0);

  if (isMatchingType(type)) {
    if (filledOptions.length >= 2) {
      const pairCount = matchingPairCount(
        filledOptions.map((option) => ({
          optionText: option.optionText,
          isCorrect: option.isCorrect ?? false,
        })),
      );
      if (pairCount > 0) {
        return (
          <AnswerRevealPanel
            count={pairCount}
            ariaLabel={`Show ${pairCount} matching pair${pairCount === 1 ? "" : "s"}`}
            title="Matching pairs"
            icon="matching"
          >
            <MatchingPairsPanel options={filledOptions} />
          </AnswerRevealPanel>
        );
      }
    }
    return (
      <span className="shrink-0 text-xs text-slate-400" title="No pairs set">
        —
      </span>
    );
  }

  if (isOrderingType(type)) {
    if (filledOptions.length > 0) {
      return (
        <AnswerRevealPanel
          count={filledOptions.length}
          ariaLabel={`Show correct order (${filledOptions.length} items)`}
          title="Correct order"
          icon="ordering"
        >
          <OrderingPanel options={filledOptions} />
        </AnswerRevealPanel>
      );
    }
    return (
      <span className="shrink-0 text-xs text-slate-400" title="No items set">
        —
      </span>
    );
  }

  if (answers.length === 0) {
    return (
      <span className="shrink-0 text-xs text-slate-400" title="No answer set">
        —
      </span>
    );
  }

  if (isMultipleChoiceType(type)) {
    return (
      <AnswerRevealPanel
        count={answers.length}
        ariaLabel={`Show ${answers.length} correct answers`}
        title={`Correct answer${answers.length === 1 ? "" : "s"}`}
        icon="list"
      >
        <ul className="space-y-1.5 text-xs text-slate-700">
          {answers.map((answer, index) => (
            <li
              key={`${index}-${answer.slice(0, 24)}`}
              className="rounded-md bg-slate-50 px-2 py-1.5 leading-snug"
            >
              {answer}
            </li>
          ))}
        </ul>
      </AnswerRevealPanel>
    );
  }

  if (isFillBlankType(type)) {
    const joined = answers.join(", ");
    const useIcon =
      answers.length > 1 || joined.length > FILL_INLINE_MAX_CHARS;
    if (useIcon) {
      return (
        <AnswerRevealPanel
          count={answers.length}
          ariaLabel="Show fill-in answer"
          title="Accepted answers"
          icon="text"
        >
          <ul className="space-y-1.5 text-xs text-slate-700">
            {answers.map((answer, index) => (
              <li
                key={`${index}-${answer.slice(0, 24)}`}
                className="rounded-md bg-slate-50 px-2 py-1.5 leading-snug"
              >
                {answer}
              </li>
            ))}
          </ul>
        </AnswerRevealPanel>
      );
    }
    return (
      <span
        className="max-w-[12rem] shrink-0 truncate text-xs font-medium text-emerald-700 sm:max-w-[16rem]"
        title={joined}
      >
        {joined}
      </span>
    );
  }

  if (isSingleChoiceType(type) || isTrueFalseType(type)) {
    const answer = answers[0] ?? "";
    return (
      <span
        className="max-w-[12rem] shrink-0 truncate text-xs font-medium text-emerald-700 sm:max-w-[16rem]"
        title={answer}
      >
        {answer}
      </span>
    );
  }

  const joined = answers.join(", ");
  if (joined.length > FILL_INLINE_MAX_CHARS || answers.length > 1) {
    return (
      <AnswerRevealPanel
        count={answers.length}
        ariaLabel="Show correct answers"
        title={`Correct answer${answers.length === 1 ? "" : "s"}`}
        icon="list"
      >
        <ul className="space-y-1.5 text-xs text-slate-700">
          {answers.map((answer, index) => (
            <li
              key={`${index}-${answer.slice(0, 24)}`}
              className="rounded-md bg-slate-50 px-2 py-1.5 leading-snug"
            >
              {answer}
            </li>
          ))}
        </ul>
      </AnswerRevealPanel>
    );
  }

  return (
    <span
      className="max-w-[12rem] shrink-0 truncate text-xs font-medium text-emerald-700 sm:max-w-[16rem]"
      title={joined}
    >
      {joined}
    </span>
  );
}
