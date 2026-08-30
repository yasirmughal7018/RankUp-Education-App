import {
  classifyStudentQuiz,
  isStudentQuizInLastMonth,
  canSwitchOtherQuizAttempts,
  formatStudentQuizListResult,
  resolveStudentQuizAction,
  type StudentQuizListItemLike,
} from "./studentQuizTypes";

function quiz(
  overrides: Partial<StudentQuizListItemLike> = {},
): StudentQuizListItemLike {
  return {
    id: 1,
    resultStatus: "Not Attempted",
    startAt: "2026-08-01T08:00:00Z",
    dueAt: "2026-08-20T18:00:00Z",
    completedAt: null,
    lastAttemptId: null,
    ...overrides,
  };
}

const now = new Date("2026-08-15T12:00:00Z");

describe("classifyStudentQuiz", () => {
  it("marks a future window as upcoming", () => {
    expect(
      classifyStudentQuiz(
        quiz({
          resultStatus: "Upcoming",
          startAt: "2026-08-20T08:00:00Z",
          dueAt: "2026-08-22T18:00:00Z",
        }),
        now,
      ),
    ).toBe("upcoming");
  });

  it("marks an open unused quiz as active", () => {
    expect(classifyStudentQuiz(quiz(), now)).toBe("active");
  });

  it("marks a submitted quiz as attempted", () => {
    expect(
      classifyStudentQuiz(
        quiz({
          resultStatus: "Completed",
          completedAt: "2026-08-14T10:00:00Z",
          lastAttemptId: 44,
        }),
        now,
      ),
    ).toBe("attempted");
  });

  it("marks a past unused quiz as expired", () => {
    expect(
      classifyStudentQuiz(
        quiz({
          resultStatus: "Expired",
          startAt: "2026-07-01T08:00:00Z",
          dueAt: "2026-07-02T18:00:00Z",
        }),
        now,
      ),
    ).toBe("expired");
  });

  it("treats a reassigned future window as upcoming even after a prior attempt", () => {
    expect(
      classifyStudentQuiz(
        quiz({
          resultStatus: "Upcoming",
          status: "upcoming",
          startAt: "2026-08-20T08:00:00Z",
          dueAt: "2026-08-22T18:00:00Z",
          completedAt: "2026-08-14T10:00:00Z",
          lastAttemptId: 44,
        }),
        now,
      ),
    ).toBe("upcoming");
  });

  it("treats a reassigned open window as open now even after a prior attempt", () => {
    expect(
      classifyStudentQuiz(
        quiz({
          resultStatus: "Not Attempted",
          status: "available",
          startAt: "2026-08-15T08:00:00Z",
          dueAt: "2026-08-20T18:00:00Z",
          completedAt: "2026-08-14T10:00:00Z",
          lastAttemptId: 44,
          attemptLimit: 2,
        }),
        now,
      ),
    ).toBe("active");
  });
});

describe("resolveStudentQuizAction", () => {
  it("starts an active unused quiz", () => {
    expect(resolveStudentQuizAction(quiz(), now)).toEqual({
      label: "Start quiz",
      to: "/student/quizzes/1",
      variant: "default",
    });
  });

  it("opens settings for upcoming and expired quizzes", () => {
    expect(
      resolveStudentQuizAction(
        quiz({
          resultStatus: "Upcoming",
          startAt: "2026-08-20T08:00:00Z",
        }),
        now,
      ).label,
    ).toBe("Open");
    expect(
      resolveStudentQuizAction(quiz({ resultStatus: "Expired" }), now).label,
    ).toBe("Open");
  });

  it("starts a reassigned open quiz instead of viewing the old result", () => {
    expect(
      resolveStudentQuizAction(
        quiz({
          resultStatus: "Not Attempted",
          status: "available",
          startAt: "2026-08-15T08:00:00Z",
          dueAt: "2026-08-20T18:00:00Z",
          completedAt: "2026-08-14T10:00:00Z",
          lastAttemptId: 44,
        }),
        now,
      ).label,
    ).toBe("Start quiz");
  });

  it("hides the action while the due date is still ahead", () => {
    expect(
      resolveStudentQuizAction(
        quiz({
          resultStatus: "Under Review",
          completedAt: "2026-08-14T10:00:00Z",
          lastAttemptId: 9,
          resultAnnouncedPercent: 70,
          resultPercent: 88,
        }),
        now,
      ),
    ).toBeNull();
  });

  it("opens the result after the due date", () => {
    expect(
      resolveStudentQuizAction(
        quiz({
          resultStatus: "Partial results",
          startAt: "2026-08-01T08:00:00Z",
          dueAt: "2026-08-14T18:00:00Z",
          completedAt: "2026-08-14T10:00:00Z",
          lastAttemptId: 9,
          resultAnnouncedPercent: 70,
        }),
        now,
      ),
    ).toEqual({
      label: "View result",
      to: "/student/quizzes/1/attempts/9/result",
      variant: "default",
    });
  });
});

describe("isStudentQuizInLastMonth", () => {
  it("keeps currently open quizzes", () => {
    expect(isStudentQuizInLastMonth(quiz(), now)).toBe(true);
  });

  it("hides quizzes that ended more than a month ago", () => {
    expect(
      isStudentQuizInLastMonth(
        quiz({
          startAt: "2026-06-01T08:00:00Z",
          dueAt: "2026-06-10T18:00:00Z",
          completedAt: "2026-06-10T12:00:00Z",
          resultStatus: "Completed",
        }),
        now,
      ),
    ).toBe(false);
  });
});

describe("canSwitchOtherQuizAttempts", () => {
  it("hides the switcher for one or two submitted attempts", () => {
    expect(canSwitchOtherQuizAttempts([])).toBe(false);
    expect(
      canSwitchOtherQuizAttempts([
        { attemptId: 1, attemptNumber: 1, status: "Submitted", percentage: 80, submittedAt: "2026-08-14T10:00:00Z" },
        { attemptId: 2, attemptNumber: 2, status: "Submitted", percentage: 90, submittedAt: "2026-08-15T10:00:00Z" },
      ]),
    ).toBe(false);
  });

  it("shows the switcher when more than two attempts exist", () => {
    expect(
      canSwitchOtherQuizAttempts([
        { attemptId: 1, attemptNumber: 1, status: "Submitted", percentage: 70, submittedAt: "2026-08-12T10:00:00Z" },
        { attemptId: 2, attemptNumber: 2, status: "Submitted", percentage: 80, submittedAt: "2026-08-13T10:00:00Z" },
        { attemptId: 3, attemptNumber: 3, status: "Submitted", percentage: 90, submittedAt: "2026-08-14T10:00:00Z" },
      ]),
    ).toBe(true);
  });
});

describe("formatStudentQuizListResult", () => {
  it("hides a score when the quiz has not been attempted", () => {
    expect(formatStudentQuizListResult(quiz(), now)).toEqual({
      label: "—",
      detail: null,
    });
  });

  it("keeps the result empty for a reassigned open window", () => {
    expect(
      formatStudentQuizListResult(
        {
          ...quiz({
            resultStatus: "Completed",
            status: "available",
            startAt: "2026-08-15T08:00:00Z",
            dueAt: "2026-08-20T18:00:00Z",
            completedAt: "2026-08-14T10:00:00Z",
            lastAttemptId: 9,
          }),
          resultPercent: 87,
          resultAnnouncedPercent: 100,
        },
        now,
      ),
    ).toEqual({ label: "—", detail: null });
  });

  it("shows the announced percentage after the due date", () => {
    expect(
      formatStudentQuizListResult(
        {
          ...quiz({
            resultStatus: "Completed",
            startAt: "2026-08-01T08:00:00Z",
            dueAt: "2026-08-14T18:00:00Z",
            completedAt: "2026-08-14T10:00:00Z",
            lastAttemptId: 9,
          }),
          resultPercent: 87,
        },
        now,
      ),
    ).toEqual({ label: "87%", detail: null });
  });

  it("shows pending with announced share until the full score is released", () => {
    expect(
      formatStudentQuizListResult(
        {
          ...quiz({
            resultStatus: "Partial results",
            startAt: "2026-08-01T08:00:00Z",
            dueAt: "2026-08-14T18:00:00Z",
            completedAt: "2026-08-14T10:00:00Z",
            lastAttemptId: 9,
          }),
          resultAnnouncedPercent: 40,
        },
        now,
      ),
    ).toEqual({ label: "Partial results", detail: "40% announced" });
  });
});
