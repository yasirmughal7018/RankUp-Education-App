export interface LinkedStudent {
  studentId: number;
  fullName: string;
  rollNumber: string;
  grade: number;
  section: string;
  relationship: string;
}

export interface ChildQuizHistoryItem {
  quizId: number;
  quizTitle: string;
  attemptId: number | null;
  attemptCount: number;
  bestPercentage: number | null;
  resultStatus: string;
  isReviewDone: boolean;
  lastSubmittedAt: string | null;
}

export interface ChildQuizHistory {
  studentId: number;
  studentName: string;
  items: ChildQuizHistoryItem[];
}

export function formatStudentLabel(student: LinkedStudent): string {
  return `${student.fullName} (Grade ${student.grade}${student.section})`;
}
