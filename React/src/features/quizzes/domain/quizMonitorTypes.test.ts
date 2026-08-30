import { describe, expect, it } from "vitest";
import {
  displayStudentName,
  formatMonitorStatus,
  getMonitorStatusTone,
  latestCheckableAttemptId,
  studentAttemptCheckPath,
  canScoreQuizAssignment,
  hasAttemptScoreAccess,
  attemptReviewActionLabel,
} from "@/features/quizzes/domain/quizMonitorTypes";

describe("displayStudentName", () => {
  it("returns trimmed name when present", () => {
    expect(displayStudentName("  Ali Khan  ", 12)).toBe("Ali Khan");
  });

  it("falls back to student id when name is missing", () => {
    expect(displayStudentName(null, 12)).toBe("12");
    expect(displayStudentName(undefined, 7)).toBe("7");
    expect(displayStudentName("   ", 3)).toBe("3");
  });
});

describe("formatMonitorStatus", () => {
  it("labels pending review for submitted attempts awaiting grading", () => {
    expect(formatMonitorStatus("pending_review")).toBe("pending review");
  });

  it("labels reviewed attempts", () => {
    expect(formatMonitorStatus("reviewed")).toBe("reviewed");
  });
});

describe("getMonitorStatusTone", () => {
  it("uses warning tone for pending review", () => {
    expect(getMonitorStatusTone("pending_review")).toBe("warning");
  });

  it("uses success tone for reviewed", () => {
    expect(getMonitorStatusTone("reviewed")).toBe("success");
  });
});

describe("studentAttemptCheckPath", () => {
  it("appends the page the reviewer came from", () => {
    expect(studentAttemptCheckPath(4, 9, "assigned")).toBe(
      "/quizzes/4/attempts/9/review?from=assigned",
    );
  });
});

describe("latestCheckableAttemptId", () => {
  it("skips in-progress drafts and returns the latest submitted id", () => {
    expect(
      latestCheckableAttemptId([
        {
          attemptId: 1,
          attemptNumber: 1,
          status: "Submitted",
          submittedAt: "2026-08-14T10:00:00Z",
        },
        {
          attemptId: 2,
          attemptNumber: 2,
          status: "InProgress",
          submittedAt: null,
        },
      ]),
    ).toBe(1);
  });
});

describe("canScoreQuizAssignment", () => {
  it("lets only the parent score parent-assigned quizzes", () => {
    expect(canScoreQuizAssignment("Parent", "Parent")).toBe(true);
    expect(canScoreQuizAssignment("Teacher", "Parent")).toBe(false);
    expect(canScoreQuizAssignment("CampusAdmin", "Parent")).toBe(false);
    expect(canScoreQuizAssignment("PortalAdmin", "Parent")).toBe(true);
  });

  it("lets teachers and school admins score teacher-assigned quizzes", () => {
    expect(canScoreQuizAssignment("Teacher", "Teacher")).toBe(true);
    expect(canScoreQuizAssignment("CampusAdmin", "Teacher")).toBe(true);
    expect(canScoreQuizAssignment("SchoolAdmin", "Teacher")).toBe(true);
    expect(canScoreQuizAssignment("Parent", "Teacher")).toBe(false);
  });
});

describe("attemptReviewActionLabel", () => {
  it("uses Check for scorers and View for everyone else", () => {
    expect(attemptReviewActionLabel(true)).toBe("Check");
    expect(attemptReviewActionLabel(false)).toBe("View");
  });

  it("uses View after the result is completed", () => {
    expect(attemptReviewActionLabel(true, true)).toBe("View");
    expect(attemptReviewActionLabel(false, true)).toBe("View");
  });
});

describe("hasAttemptScoreAccess", () => {
  it("only allows scoring when the API explicitly says so", () => {
    expect(hasAttemptScoreAccess(undefined)).toBe(false);
    expect(hasAttemptScoreAccess(false)).toBe(false);
    expect(hasAttemptScoreAccess(true)).toBe(true);
  });
});

