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
