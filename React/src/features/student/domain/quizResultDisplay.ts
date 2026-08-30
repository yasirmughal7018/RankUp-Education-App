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

/** Resolve result visibility: auto-graded after due date; full Completed after owner action. */
export function resolveQuizResultDisplay(
  result: QuizAttemptResult,
): QuizResultDisplayFlags {
  const announcedPercent = announcedPercentOf(result);
  const announcesAt = result.resultsAnnounceAt?.trim() || null;
  const ownerPending = result.reviewPending === true;

  if (announcedPercent <= 0) {
    const when = announcesAt
      ? ` Auto-graded answers (questions with a known correct answer) are announced when the quiz due date ends${formatAnnounceWhen(announcesAt)}.`
      : " Auto-graded answers (questions with a known correct answer) are announced when the quiz due date ends.";
    return {
      mode: "Full",
      reviewPending: true,
      showScore: false,
      showCorrectness: false,
      showCorrectAnswers: false,
      showExplanations: false,
      announcedPercent: 0,
      announcesAt,
      modeNote: `Results are pending.${when} The owner marks the quiz Completed to release the full result.`,
    };
  }

  if (ownerPending || announcedPercent < 100) {
    return {
      mode: "Full",
      reviewPending: true,
      showScore: true,
      showCorrectness: true,
      showCorrectAnswers: true,
      showExplanations: true,
      announcedPercent,
      announcesAt,
      modeNote:
        announcedPercent < 100
          ? `${announcedPercent}% of this result is announced (auto-graded questions). The rest stays pending until the owner marks the quiz Completed.`
          : "Auto-graded answers are announced. The owner has not marked this quiz Completed yet.",
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
