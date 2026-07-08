import { describe, expect, it } from "vitest";
import { queryKeys } from "@/core/api/queryKeys";

describe("queryKeys", () => {
  it("builds stable assignment board keys", () => {
    expect(queryKeys.assignmentBoard()).toEqual([
      "quizzes",
      "assignment-board",
      null,
    ]);
    expect(queryKeys.assignmentBoard(12)).toEqual([
      "quizzes",
      "assignment-board",
      12,
    ]);
  });

  it("builds report and directory keys", () => {
    expect(queryKeys.reportQuizSummary()).toEqual(["reports", "quiz-summary"]);
    expect(queryKeys.reportRankings(5)).toEqual(["reports", "rankings", 5]);
    expect(queryKeys.directoryParents("ali")).toEqual([
      "directory",
      "parents",
      "ali",
    ]);
    expect(queryKeys.studentQuizHistory(9)).toEqual([
      "reports",
      "students",
      9,
      "quiz-history",
    ]);
  });
});
