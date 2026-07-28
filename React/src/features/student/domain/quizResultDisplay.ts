import type { QuizAttemptResult } from "@/features/student/domain/studentQuizTypes";
import { normalizeQuizReviewDisplayMode } from "@/features/quizzes/domain/quizTypes";

/** UI flags derived from API review display mode + pending mask. */
export interface QuizResultDisplayFlags {
  mode: string;
  reviewPending: boolean;
  showScore: boolean;
  showCorrectness: boolean;
  showCorrectAnswers: boolean;
  showExplanations: boolean;
  modeNote: string | null;
}

/** Resolve what the result screen may show for Full / CorrectAnswers / ScoreOnly / Withheld. */
export function resolveQuizResultDisplay(
  result: QuizAttemptResult,
): QuizResultDisplayFlags {
  const mode = normalizeQuizReviewDisplayMode(result.reviewDisplayMode);
  const reviewPending = Boolean(result.reviewPending);

  if (reviewPending) {
    return {
      mode,
      reviewPending: true,
      showScore: false,
      showCorrectness: false,
      showCorrectAnswers: false,
      showExplanations: false,
      modeNote:
        "Results are withheld until the teacher publishes review. Final marks may change.",
    };
  }

  if (mode === "Full") {
    return {
      mode,
      reviewPending: false,
      showScore: true,
      showCorrectness: true,
      showCorrectAnswers: true,
      showExplanations: true,
      modeNote: null,
    };
  }

  if (mode === "CorrectAnswers") {
    return {
      mode,
      reviewPending: false,
      showScore: true,
      showCorrectness: true,
      showCorrectAnswers: true,
      showExplanations: false,
      modeNote: "Explanations are hidden for this quiz. Correct answers are shown.",
    };
  }

  if (mode === "Withheld") {
    return {
      mode,
      reviewPending: false,
      showScore: true,
      showCorrectness: false,
      showCorrectAnswers: false,
      showExplanations: false,
      modeNote: "Only your score is shown. Correct answers and explanations stay hidden.",
    };
  }

  // ScoreOnly
  return {
    mode: "ScoreOnly",
    reviewPending: false,
    showScore: true,
    showCorrectness: false,
    showCorrectAnswers: false,
    showExplanations: false,
    modeNote: "Score only — correct answers and explanations are not shown.",
  };
}

export function formatSelectedOptionIds(question: {
  selectedOptionId: number | null;
  selectedOptionIds?: number[] | null;
}): string | null {
  const ids =
    question.selectedOptionIds && question.selectedOptionIds.length > 0
      ? question.selectedOptionIds
      : question.selectedOptionId != null
        ? [question.selectedOptionId]
        : [];
  if (ids.length === 0) {
    return null;
  }
  return ids.join(", ");
}

export function formatCorrectOptionIds(question: {
  correctOptionId: number | null;
  correctOptionIds?: number[] | null;
}): string | null {
  const ids =
    question.correctOptionIds && question.correctOptionIds.length > 0
      ? question.correctOptionIds
      : question.correctOptionId != null
        ? [question.correctOptionId]
        : [];
  if (ids.length === 0) {
    return null;
  }
  return ids.join(", ");
}
