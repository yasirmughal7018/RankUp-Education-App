export interface QuizSummaryReport {
  totalQuizzes: number;
  publishedQuizzes: number;
  totalAssignments: number;
  submittedAttempts: number;
  pendingReviews: number;
  reviewedAssignments: number;
  averagePercentage: number | null;
}

export interface QuizPerformanceStudent {
  studentId: number;
  studentName: string;
  attemptCount: number;
  bestPercentage: number | null;
  isReviewDone: boolean;
  status: string;
}

export interface QuizPerformanceReport {
  quizId: number;
  quizTitle: string;
  totalStudents: number;
  submittedCount: number;
  pendingReviewCount: number;
  reviewedCount: number;
  averagePercentage: number | null;
  students: QuizPerformanceStudent[];
}

export interface RankingItem {
  rank: number;
  studentId: number;
  studentName: string;
  bestPercentage: number;
  attemptCount: number;
}

export interface RankingReport {
  quizId: number | null;
  title: string;
  items: RankingItem[];
}

export interface StudentQuizHistoryItem {
  quizId: number;
  quizTitle: string;
  attemptId: number | null;
  attemptCount: number;
  bestPercentage: number | null;
  resultStatus: string;
  isReviewDone: boolean;
  lastSubmittedAt: string | null;
}

export interface StudentQuizHistory {
  studentId: number;
  studentName: string;
  items: StudentQuizHistoryItem[];
}

export type ReportViewerRole = "SuperAdmin" | "SchoolAdmin" | "Teacher";

export const REPORT_VIEWER_ROLES: ReportViewerRole[] = [
  "SuperAdmin",
  "SchoolAdmin",
  "Teacher",
];

export function canViewReports(role: string): boolean {
  return REPORT_VIEWER_ROLES.includes(role as ReportViewerRole);
}
