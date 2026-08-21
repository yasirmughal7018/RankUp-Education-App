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
