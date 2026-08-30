export interface AssignmentBoardItem {
  assignmentId: number;
  quizId: number;
  quizTitle: string;
  studentId: number;
  studentName: string;
  startAt: string;
  endAt: string;
  allowedAttempts: number;
  attemptCount: number;
  isReviewDone: boolean;
  resultStatus: string;
  monitorStatus: string;
  lastAttemptId?: number | null;
  canScore?: boolean;
}

export interface PendingReviewItem {
  quizId: number;
  quizTitle: string;
  attemptId: number;
  studentId: number;
  studentName: string;
  attemptNumber: number;
  submittedAt: string;
  totalMarks: number;
  obtainedMarks: number;
  canScore?: boolean;
}

export interface QuizMonitoringStudent {
  studentId: number;
  studentName: string;
  assignmentId: number;
  attemptCount: number;
  bestPercentage: number | null;
  isReviewDone: boolean;
  status: string;
  lastSubmittedAt: string | null;
  focusLossCount?: number;
  clipboardPasteCount?: number;
  lastAttemptId?: number | null;
  canScore?: boolean;
}

export interface QuizMonitoring {
  quizId: number;
  quizTitle: string;
  totalStudents: number;
  submittedCount: number;
  pendingReviewCount: number;
  reviewedCount: number;
  students: QuizMonitoringStudent[];
}

export interface AttemptReviewOption {
  id: number;
  text: string;
  imageUrl?: string | null;
  isCorrect: boolean;
}

export interface AttemptReviewQuestion {
  questionId: number;
  questionText: string;
  questionType: string;
  maxMarks: number;
  awardedMarks: number;
  isCorrect: boolean;
  selectedOptionId: number | null;
  selectedOptionIds?: number[] | null;
  submittedText: string | null;
  parentFeedback: string | null;
  requiresReview: boolean;
  aiFeedback?: string | null;
  options?: AttemptReviewOption[];
}

export interface AttemptReview {
  attemptId: number;
  quizId: number;
  quizTitle: string;
  studentId: number;
  studentName: string;
  attemptNumber: number;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  status: string;
  isReviewDone: boolean;
  submittedAt: string;
  questions: AttemptReviewQuestion[];
  focusLossCount?: number;
  clipboardPasteCount?: number;
  canScore?: boolean;
  assignedByRole?: string;
}

/** Fallback to student id when name missing. */
export function displayStudentName(
  studentName: string | null | undefined,
  studentId: number,
): string {
  const trimmed = studentName?.trim();
  return trimmed ? trimmed : String(studentId);
}

export interface MarkAttemptAnswerInput {
  questionId: number;
  awardedMarks: number;
  feedback?: string | null;
}

/** Humanize snake_case monitor status. */
export function formatMonitorStatus(status: string): string {
  return status.replace(/_/g, " ");
}

/** Compact integrity counters for monitor/review chips. */
export function formatIntegrityCounters(
  focusLossCount = 0,
  clipboardPasteCount = 0,
): string | null {
  if (focusLossCount <= 0 && clipboardPasteCount <= 0) {
    return null;
  }

  const parts: string[] = [];
  if (focusLossCount > 0) {
    parts.push(`Focus ${focusLossCount}`);
  }
  if (clipboardPasteCount > 0) {
    parts.push(`Paste ${clipboardPasteCount}`);
  }
  return parts.join(" · ");
}

/** Badge color tone from monitor status string. */
export function getMonitorStatusTone(
  status: string,
): "default" | "success" | "warning" | "danger" {
  const normalized = status.toLowerCase();

  if (normalized.includes("pending")) {
    return "warning";
  }

  if (normalized.includes("reviewed") || normalized.includes("completed")) {
    return "success";
  }

  if (normalized.includes("missed") || normalized.includes("overdue")) {
    return "danger";
  }

  return "default";
}

/** Build CSV rows for quiz monitoring export (reports-style). */
export function buildQuizMonitoringCsv(monitoring: QuizMonitoring): string {
  const headers = [
    "Student ID",
    "Student Name",
    "Attempts",
    "Best %",
    "Status",
    "Last Submitted",
    "Review Done",
    "Focus Loss",
    "Clipboard Paste",
  ];

  const rows = monitoring.students.map((student) => [
    student.studentId,
    student.studentName,
    student.attemptCount,
    student.bestPercentage ?? "",
    student.status,
    student.lastSubmittedAt ?? "",
    student.isReviewDone ? "Yes" : "No",
    student.focusLossCount ?? 0,
    student.clipboardPasteCount ?? 0,
  ]);

  const escape = (value: string | number) => {
    const text = String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  return [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
    "",
  ].join("\n");
}

export type StudentAttemptCheckFrom = "assigned" | "monitoring" | "board";

/** Review workspace for a submitted student attempt. */
export function studentAttemptCheckPath(
  quizId: number,
  attemptId: number,
  from?: StudentAttemptCheckFrom,
): string {
  const path = `/quizzes/${quizId}/attempts/${attemptId}/review`;
  return from ? `${path}?from=${from}` : path;
}

/** Submitted / reviewed / expired — not an open draft. */
export function isCheckableAttemptStatus(status: string): boolean {
  const normalized = status.toLowerCase().replace(/[_\s-]/g, "");
  return (
    normalized.length > 0 &&
    !normalized.includes("progress") &&
    normalized !== "started"
  );
}

/** Latest submitted attempt id from an assignment's attempt list. */
export function latestCheckableAttemptId(
  attempts:
    | Array<{
        attemptId?: number | null;
        attemptNumber: number;
        status: string;
        submittedAt?: string | null;
      }>
    | null
    | undefined,
): number | null {
  let best: { attemptId: number; attemptNumber: number } | null = null;

  for (const attempt of attempts ?? []) {
    if (attempt.attemptId == null || attempt.attemptId <= 0) {
      continue;
    }
    if (!isCheckableAttemptStatus(attempt.status)) {
      continue;
    }
    if (
      !best ||
      attempt.attemptNumber > best.attemptNumber ||
      (attempt.attemptNumber === best.attemptNumber &&
        attempt.attemptId > best.attemptId)
    ) {
      best = { attemptId: attempt.attemptId, attemptNumber: attempt.attemptNumber };
    }
  }

  return best?.attemptId ?? null;
}

/** True when the current role may mark or update this assignment. */
export function canScoreQuizAssignment(
  callerRole: string | null | undefined,
  assignedByRole: string | null | undefined,
): boolean {
  const caller = (callerRole ?? "").toLowerCase();
  const origin = (assignedByRole ?? "Teacher").toLowerCase();
  if (caller === "portaladmin") {
    return true;
  }
  if (origin === "parent") {
    return caller === "parent";
  }
  return (
    caller === "teacher" ||
    caller === "coordinator" ||
    caller === "campusadmin" ||
    caller === "schooladmin"
  );
}

export function hasAttemptScoreAccess(canScore: boolean | null | undefined): boolean {
  return canScore === true;
}

export function attemptReviewActionLabel(
  canScore: boolean,
  isReviewDone = false,
): "Check" | "View" {
  return canScore && !isReviewDone ? "Check" : "View";
}

export function attemptReviewScoreHint(
  canScore: boolean,
  assignedByRole: string | null | undefined,
): string | null {
  if (canScore) {
    return null;
  }

  const origin = (assignedByRole ?? "").toLowerCase();
  if (origin === "parent") {
    return "This quiz was assigned by a parent. You can view answers and marks. Ask the parent to update scoring if something is wrong.";
  }

  return "This quiz was assigned by a teacher. You can view answers and marks. Ask the teacher, campus admin, or school admin to update scoring if something is wrong.";
}
