import { describe, expect, it } from "vitest";
import { displayStudentName } from "@/features/quizzes/domain/quizMonitorTypes";

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
