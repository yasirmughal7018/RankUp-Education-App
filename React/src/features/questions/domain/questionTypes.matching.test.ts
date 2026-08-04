import { describe, expect, it } from "vitest";
import {
  addMatchingPair,
  matchingPairCount,
  removeMatchingPair,
  updateMatchingPairSide,
  type QuestionOptionInput,
} from "@/features/questions/domain/questionTypes";

function blanks(count: number): QuestionOptionInput[] {
  return Array.from({ length: count }, () => ({
    optionText: "",
    isCorrect: false,
  }));
}

describe("matching pair helpers", () => {
  it("counts pairs from lefts-then-rights layout", () => {
    expect(matchingPairCount(blanks(4))).toBe(2);
    expect(matchingPairCount(blanks(6))).toBe(3);
  });

  it("adds a pair without breaking lefts-then-rights order", () => {
    const start: QuestionOptionInput[] = [
      { optionText: "L1", isCorrect: false },
      { optionText: "L2", isCorrect: false },
      { optionText: "R1", isCorrect: false },
      { optionText: "R2", isCorrect: false },
    ];

    const next = addMatchingPair(start);
    expect(next.map((option) => option.optionText)).toEqual([
      "L1",
      "L2",
      "",
      "R1",
      "R2",
      "",
    ]);
    expect(matchingPairCount(next)).toBe(3);
  });

  it("removes a pair and keeps even lefts-then-rights layout", () => {
    const start: QuestionOptionInput[] = [
      { optionText: "L1", isCorrect: false },
      { optionText: "L2", isCorrect: false },
      { optionText: "L3", isCorrect: false },
      { optionText: "R1", isCorrect: false },
      { optionText: "R2", isCorrect: false },
      { optionText: "R3", isCorrect: false },
    ];

    const next = removeMatchingPair(start, 1);
    expect(next.map((option) => option.optionText)).toEqual([
      "L1",
      "L3",
      "R1",
      "R3",
    ]);
  });

  it("does not remove below two pairs", () => {
    const start = blanks(4);
    expect(removeMatchingPair(start, 0)).toEqual(start);
  });

  it("updates left and right sides independently", () => {
    const start = blanks(4);
    const withLeft = updateMatchingPairSide(start, 0, "left", "France");
    const withBoth = updateMatchingPairSide(withLeft, 0, "right", "Paris");
    expect(withBoth[0]?.optionText).toBe("France");
    expect(withBoth[2]?.optionText).toBe("Paris");
  });
});
