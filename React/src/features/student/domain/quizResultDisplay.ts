import type { QuizAttemptResult } from "@/features/student/domain/studentQuizTypes";

/** UI flags for the post-submit result screen (Full when review is not pending). */
export interface QuizResultDisplayFlags {
  mode: string;
  reviewPending: boolean;
  showScore: boolean;
  showCorrectness: boolean;
  showCorrectAnswers: boolean;
  showExplanations: boolean;
  modeNote: string | null;
}

/** Resolve result visibility. Review display modes are retired — Full unless review is pending. */
export function resolveQuizResultDisplay(
  result: QuizAttemptResult,
): QuizResultDisplayFlags {
  const reviewPending = Boolean(result.reviewPending);

  if (reviewPending) {
    return {
      mode: "Full",
      reviewPending: true,
      showScore: false,
      showCorrectness: false,
      showCorrectAnswers: false,
      showExplanations: false,
      modeNote:
        "Results are withheld until the teacher publishes review. Final marks may change.",
    };
  }

  return {
    mode: "Full",
    reviewPending: false,
    showScore: true,
    showCorrectness: true,
    showCorrectAnswers: true,
    showExplanations: true,
    modeNote: null,
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
