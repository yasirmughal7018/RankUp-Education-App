export interface TeacherClassSection {
  grade: number;
  section: string;
}

export interface TeacherRosterStudent {
  studentId: number;
  fullName: string;
  username: string;
  rollNumber: string;
  grade: number;
  section: string;
}

export interface TeacherRoster {
  classSections: TeacherClassSection[];
  students: TeacherRosterStudent[];
}

export interface TeacherGroupMember {
  studentId: number;
  fullName: string;
  username: string;
  rollNumber: string;
  grade: number;
  section: string;
}

export interface TeacherGroup {
  groupId: number;
  groupName: string;
  description: string;
  isActive: boolean;
  memberCount: number;
  members: TeacherGroupMember[];
}

export function formatClassSection(item: TeacherClassSection): string {
  return `Grade ${item.grade}${item.section}`;
}

export function formatRosterStudent(student: TeacherRosterStudent): string {
  return `${student.fullName} (Grade ${student.grade}${student.section})`;
}
