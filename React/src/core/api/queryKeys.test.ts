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
    expect(queryKeys.reportQuizSummary()).toEqual([
      "reports",
      "quiz-summary",
      null,
      null,
    ]);
    expect(queryKeys.reportQuizSummary("2026-01-01", "2026-01-31")).toEqual([
      "reports",
      "quiz-summary",
      "2026-01-01",
      "2026-01-31",
    ]);
    expect(queryKeys.reportRankings(5)).toEqual(["reports", "rankings", 5]);
    expect(queryKeys.directoryParents({ search: "ali" })).toEqual([
      "directory",
      "parents",
      { search: "ali" },
    ]);
    expect(
      queryKeys.directoryStudents({
        schoolId: 1,
        pageNumber: 2,
        pageSize: 25,
      }),
    ).toEqual([
      "directory",
      "students",
      { schoolId: 1, pageNumber: 2, pageSize: 25 },
    ]);
    expect(queryKeys.studentQuizHistory(9)).toEqual([
      "reports",
      "students",
      9,
      "quiz-history",
    ]);
  });
});
