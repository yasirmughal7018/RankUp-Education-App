export interface LinkedStudent {
  studentId: number;
  fullName: string;
  username: string;
  rollNumber: string;
  grade: number;
  section: string;
  relationship: string;
}

/** Parent self-link by CNIC or username. */
export interface LinkMyChildInput {
  identifier: string;
  relationship?: string;
}

export interface LinkMyChildResult extends LinkedStudent {
  alreadyLinked: boolean;
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
  const section = student.section?.trim();
  const classPart = section
    ? `Grade ${student.grade} · ${section}`
    : `Grade ${student.grade}`;
  return `${student.fullName} (${classPart})`;
}
