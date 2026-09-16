export interface StudentMePerson {
  fullName: string;
  detail: string | null;
}

export interface StudentMeOverview {
  fullName: string;
  username: string;
  rollNumber: string;
  grade: number;
  section: string;
  schoolName: string | null;
  campusName: string | null;
  parents: StudentMePerson[];
  coordinators: StudentMePerson[];
  teachers: StudentMePerson[];
}

export interface StudentClassHistoryItem {
  id: number;
  grade: number;
  gradeLabel: string;
  section: string;
  schoolName: string | null;
  campusName: string | null;
  startedAt: string;
  endedAt: string | null;
  isCurrent: boolean;
  source: string;
}

export interface StudentClassHistory {
  items: StudentClassHistoryItem[];
}

export function formatStudentClassLabel(overview: StudentMeOverview): string {
  const section = overview.section?.trim();
  return section
    ? `Grade ${overview.grade} · ${section}`
    : `Grade ${overview.grade}`;
}

export function formatClassHistoryPlacement(item: StudentClassHistoryItem): string {
  const grade = item.gradeLabel?.trim() || `Grade ${item.grade}`;
  const section = item.section?.trim();
  return section ? `${grade} · Section ${section}` : grade;
}

export function personInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) {
    return "?";
  }
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}
