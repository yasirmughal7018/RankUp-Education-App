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

export interface AttemptReviewQuestion {
  questionId: number;
  questionText: string;
  questionType: string;
  maxMarks: number;
  awardedMarks: number;
  isCorrect: boolean;
  selectedOptionId: number | null;
  submittedText: string | null;
  parentFeedback: string | null;
  requiresReview: boolean;
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
