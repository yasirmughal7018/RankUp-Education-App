import { describe, expect, it } from "vitest";
import {
  displayStudentName,
  formatMonitorStatus,
  getMonitorStatusTone,
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
