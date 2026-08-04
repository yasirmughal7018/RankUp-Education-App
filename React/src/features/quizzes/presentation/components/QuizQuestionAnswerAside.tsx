import { useEffect, useId, useRef, useState } from "react";
import { ListChecks, MessageSquareText } from "lucide-react";
import {
  isFillBlankType,
  isMultipleChoiceType,
  isSingleChoiceType,
  isTrueFalseType,
} from "@/features/questions/domain/questionTypes";
import type { QuizQuestionItem } from "@/features/quizzes/domain/quizTypes";

const FILL_INLINE_MAX_CHARS = 48;

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

interface AnswerRevealProps {
  answers: string[];
  ariaLabel: string;
  icon: "list" | "text";
}

function AnswerReveal({ answers, ariaLabel, icon }: AnswerRevealProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();
  const Icon = icon === "list" ? ListChecks : MessageSquareText;

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
        <span className="text-[10px] font-semibold tabular-nums">
          {answers.length}
        </span>
      </button>
      {open ? (
        <span
          id={panelId}
          role="dialog"
          className="absolute right-0 top-full z-30 mt-1.5 w-64 max-w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg"
        >
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Correct answer{answers.length === 1 ? "" : "s"}
          </p>
          <ul className="max-h-48 space-y-1.5 overflow-auto text-xs text-slate-700">
            {answers.map((answer, index) => (
              <li
                key={`${index}-${answer.slice(0, 24)}`}
                className="rounded-md bg-slate-50 px-2 py-1.5 leading-snug"
              >
                {answer}
              </li>
            ))}
          </ul>
        </span>
      ) : null}
    </span>
  );
}

interface QuizQuestionAnswerAsideProps {
  questionType: string;
  answers: string[];
}

/**
 * Shows correct answer(s) to the right of question text.
 * Single / True-False: inline. Multiple Choice: click icon. Long Fill: click icon.
 */
export function QuizQuestionAnswerAside({
  questionType,
  answers,
}: QuizQuestionAnswerAsideProps) {
  if (answers.length === 0) {
    return (
      <span className="shrink-0 text-xs text-slate-400" title="No answer set">
        —
      </span>
    );
  }

  if (isMultipleChoiceType(questionType)) {
    return (
      <AnswerReveal
        answers={answers}
        ariaLabel={`Show ${answers.length} correct answers`}
        icon="list"
      />
    );
  }

  if (isFillBlankType(questionType)) {
    const joined = answers.join(", ");
    const useIcon =
      answers.length > 1 || joined.length > FILL_INLINE_MAX_CHARS;
    if (useIcon) {
      return (
        <AnswerReveal
          answers={answers}
          ariaLabel="Show fill-in answer"
          icon="text"
        />
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

  if (isSingleChoiceType(questionType) || isTrueFalseType(questionType)) {
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
      <AnswerReveal
        answers={answers}
        ariaLabel="Show correct answers"
        icon="list"
      />
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
