export interface LinkedStudent {
  studentId: number;
  fullName: string;
  username: string;
  rollNumber: string;
  grade: number;
  section: string;
  relationship: string;
  schoolName?: string | null;
  campusName?: string | null;
  isActive: boolean;
  accountStatus?: string | null;
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

export interface ParentGroupMember {
  studentId: number;
  fullName: string;
  username: string;
  rollNumber: string;
  grade: number;
  section: string;
}

export interface ParentGroup {
  groupId: number;
  groupName: string;
  description: string;
  isActive: boolean;
  memberCount: number;
  members: ParentGroupMember[];
}

export function formatStudentLabel(
  student: LinkedStudent | ParentGroupMember,
): string {
  const section = student.section?.trim();
  const classPart = section
    ? `Grade ${student.grade} · ${section}`
    : `Grade ${student.grade}`;
  return `${student.fullName} (${classPart})`;
}

export function childMatchesQuery(
  student: LinkedStudent | ParentGroupMember,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const haystack =
    `${student.fullName} ${student.username} ${student.rollNumber} grade ${student.grade}${student.section}`.toLowerCase();
  return haystack.includes(needle);
}

export function formatStudentPlacement(student: LinkedStudent): string {
  const parts = [
    student.schoolName?.trim() || null,
    student.campusName?.trim() || null,
  ].filter((part): part is string => Boolean(part) && part !== "—");
  return parts.length > 0 ? parts.join(" · ") : "School not assigned";
}
