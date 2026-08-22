import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
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
const PANEL_WIDTH_PX = 288;
const PANEL_GAP_PX = 8;
const PANEL_Z_INDEX = 50;

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

interface AnswerPanelPosition {
  top: number;
  left: number;
  placement: "above" | "below";
}

function AnswerRevealPanel({
  count,
  ariaLabel,
  title,
  icon,
  children,
}: AnswerRevealPanelProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<AnswerPanelPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const Icon =
    icon === "list"
      ? ListChecks
      : icon === "text"
        ? MessageSquareText
        : icon === "matching"
          ? Shuffle
          : ArrowDownUp;

  const computePosition = useCallback((): AnswerPanelPosition | null => {
    const button = buttonRef.current;
    if (!button) {
      return null;
    }

    const rect = button.getBoundingClientRect();
    const panelHeight = panelRef.current?.offsetHeight ?? 240;
    const spaceBelow = window.innerHeight - rect.bottom - PANEL_GAP_PX;
    const spaceAbove = rect.top - PANEL_GAP_PX;
    const placement =
      spaceBelow >= panelHeight || spaceBelow >= spaceAbove ? "below" : "above";

    let left = rect.right - PANEL_WIDTH_PX;
    left = Math.max(
      PANEL_GAP_PX,
      Math.min(left, window.innerWidth - PANEL_WIDTH_PX - PANEL_GAP_PX),
    );

    const top =
      placement === "below"
        ? rect.bottom + PANEL_GAP_PX
        : rect.top - PANEL_GAP_PX;

    return { top, left, placement };
  }, []);

  const updatePosition = useCallback(() => {
    const next = computePosition();
    if (next) {
      setPosition(next);
    }
  }, [computePosition]);

  useEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useLayoutEffect(() => {
    if (open) {
      updatePosition();
    }
  }, [open, children, updatePosition]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
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

  const panel =
    open && position
      ? createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={title}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: PANEL_WIDTH_PX,
              zIndex: PANEL_Z_INDEX,
              transform:
                position.placement === "above" ? "translateY(-100%)" : undefined,
            }}
            className="max-w-[min(18rem,calc(100vw-1rem))] rounded-lg border border-border bg-popover p-2.5 text-popover-foreground shadow-lg ring-1 ring-border/40"
          >
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
            <div className="max-h-56 overflow-auto">{children}</div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-muted/70 px-1.5 py-0.5 text-muted-foreground transition hover:border-primary/30 hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title={ariaLabel}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => {
            const next = !current;
            if (next) {
              setPosition(computePosition());
            } else {
              setPosition(null);
            }
            return next;
          });
        }}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
        <span className="text-[10px] font-semibold tabular-nums">{count}</span>
      </button>
      {panel}
    </>
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
    <ul className="space-y-2 text-xs text-foreground">
      {Array.from({ length: pairCount }, (_, pairIndex) => {
        const left = options[pairIndex];
        const right = options[pairCount + pairIndex];
        if (!left || !right) {
          return null;
        }

        return (
          <li
            key={`pair-${pairIndex}`}
            className="rounded-md border border-border bg-muted/50 p-2"
          >
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-secondary">
              Pair {pairIndex + 1}
            </p>
            <div className="space-y-1">
              <p className="flex items-start gap-1.5 leading-snug">
                <span className="shrink-0 rounded-full bg-card px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  L{pairIndex + 1}
                </span>
                <span className="min-w-0">{left.optionText.trim() || "—"}</span>
              </p>
              <p className="flex items-start gap-1.5 leading-snug">
                <span className="shrink-0 rounded-full bg-card px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
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
    <ol className="space-y-1.5 text-xs text-foreground">
      {options.map((option, index) => (
        <li
          key={`order-${index}-${option.optionText.slice(0, 12)}`}
          className="flex items-start gap-1.5 rounded-md bg-muted/50 px-2 py-1.5 leading-snug"
        >
          <span className="shrink-0 rounded-full bg-card px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
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
      <span className="shrink-0 text-xs text-muted-foreground" title="No pairs set">
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
      <span className="shrink-0 text-xs text-muted-foreground" title="No items set">
        —
      </span>
    );
  }

  if (answers.length === 0) {
    return (
      <span className="shrink-0 text-xs text-muted-foreground" title="No answer set">
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
        <ul className="space-y-1.5 text-xs text-foreground">
          {answers.map((answer, index) => (
            <li
              key={`${index}-${answer.slice(0, 24)}`}
              className="rounded-md bg-muted/50 px-2 py-1.5 leading-snug"
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
          <ul className="space-y-1.5 text-xs text-foreground">
            {answers.map((answer, index) => (
              <li
                key={`${index}-${answer.slice(0, 24)}`}
                className="rounded-md bg-muted/50 px-2 py-1.5 leading-snug"
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
        className="max-w-[12rem] shrink-0 truncate text-xs font-medium text-secondary sm:max-w-[16rem]"
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
        className="max-w-[12rem] shrink-0 truncate text-xs font-medium text-secondary sm:max-w-[16rem]"
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
        <ul className="space-y-1.5 text-xs text-foreground">
          {answers.map((answer, index) => (
            <li
              key={`${index}-${answer.slice(0, 24)}`}
              className="rounded-md bg-muted/50 px-2 py-1.5 leading-snug"
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
      className="max-w-[12rem] shrink-0 truncate text-xs font-medium text-secondary sm:max-w-[16rem]"
      title={joined}
    >
      {joined}
    </span>
  );
}
