import type { QuizAttemptResult } from "@/features/student/domain/studentQuizTypes";

/** UI flags for the post-submit result screen. */
export interface QuizResultDisplayFlags {
  mode: string;
  reviewPending: boolean;
  showScore: boolean;
  showCorrectness: boolean;
  showCorrectAnswers: boolean;
  showExplanations: boolean;
  announcedPercent: number;
  announcesAt: string | null;
  modeNote: string | null;
}

function announcedPercentOf(result: QuizAttemptResult): number {
  if (typeof result.resultAnnouncedPercent === "number") {
    return Math.max(0, Math.min(100, result.resultAnnouncedPercent));
  }

  return result.reviewPending ? 0 : 100;
}

/** Resolve result visibility, including the 1-hour auto-graded announcement delay. */
export function resolveQuizResultDisplay(
  result: QuizAttemptResult,
): QuizResultDisplayFlags {
  const announcedPercent = announcedPercentOf(result);
  const announcesAt = result.resultsAnnounceAt?.trim() || null;

  if (announcedPercent <= 0) {
    const when = announcesAt
      ? ` Auto-graded answers (questions with a known correct answer) are announced 1 hour after the quiz ends${formatAnnounceWhen(announcesAt)}.`
      : " Auto-graded answers (questions with a known correct answer) are announced 1 hour after the quiz ends.";
    return {
      mode: "Full",
      reviewPending: true,
      showScore: false,
      showCorrectness: false,
      showCorrectAnswers: false,
      showExplanations: false,
      announcedPercent: 0,
      announcesAt,
      modeNote: `Results are pending.${when} Teacher-review questions stay pending until they are marked.`,
    };
  }

  if (announcedPercent < 100) {
    return {
      mode: "Full",
      reviewPending: true,
      showScore: true,
      showCorrectness: true,
      showCorrectAnswers: true,
      showExplanations: true,
      announcedPercent,
      announcesAt,
      modeNote: `${announcedPercent}% of this result is announced (auto-graded questions). The rest stays pending until a teacher publishes review.`,
    };
  }

  return {
    mode: "Full",
    reviewPending: false,
    showScore: true,
    showCorrectness: true,
    showCorrectAnswers: true,
    showExplanations: true,
    announcedPercent: 100,
    announcesAt,
    modeNote: null,
  };
}

function formatAnnounceWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return ` (${date.toLocaleString()})`;
}

/** Label for list/detail cards, e.g. "70% results announced". */
export function formatAnnouncedResultsLabel(
  percent: number | null | undefined,
): string | null {
  if (typeof percent !== "number" || Number.isNaN(percent)) {
    return null;
  }

  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return `${clamped}% results announced`;
}
