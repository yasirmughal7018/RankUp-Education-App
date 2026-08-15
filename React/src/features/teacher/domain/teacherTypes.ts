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

export interface AddMyStudentResult extends TeacherRosterStudent {
  alreadyOnRoster: boolean;
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

export function classSectionKey(grade: number, section: string): string {
  return `${grade}|${section.trim()}`;
}

export function compareRosterStudents(
  left: TeacherRosterStudent,
  right: TeacherRosterStudent,
): number {
  const roll = left.rollNumber.localeCompare(right.rollNumber, undefined, {
    numeric: true,
    sensitivity: "base",
  });
  if (roll !== 0) {
    return roll;
  }
  return left.fullName.localeCompare(right.fullName, undefined, {
    sensitivity: "base",
  });
}

export function rosterStudentMatchesQuery(
  student: TeacherRosterStudent,
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

export interface RosterSectionBucket {
  grade: number;
  section: string;
  students: TeacherRosterStudent[];
}

export interface RosterGradeBucket {
  grade: number;
  sections: RosterSectionBucket[];
  studentCount: number;
}

/** Assigned classes plus roster students, grouped grade → section. */
export function buildRosterGradeBuckets(
  classSections: TeacherClassSection[],
  students: TeacherRosterStudent[],
): RosterGradeBucket[] {
  const sections = new Map<string, RosterSectionBucket>();

  for (const item of classSections) {
    const key = classSectionKey(item.grade, item.section);
    if (!sections.has(key)) {
      sections.set(key, {
        grade: item.grade,
        section: item.section.trim(),
        students: [],
      });
    }
  }

  for (const student of students) {
    const key = classSectionKey(student.grade, student.section);
    const existing = sections.get(key);
    if (existing) {
      existing.students.push(student);
    } else {
      sections.set(key, {
        grade: student.grade,
        section: student.section.trim(),
        students: [student],
      });
    }
  }

  const byGrade = new Map<number, RosterSectionBucket[]>();
  for (const bucket of sections.values()) {
    bucket.students.sort(compareRosterStudents);
    const list = byGrade.get(bucket.grade) ?? [];
    list.push(bucket);
    byGrade.set(bucket.grade, list);
  }

  return [...byGrade.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([grade, gradeSections]) => {
      const sorted = [...gradeSections].sort((left, right) =>
        left.section.localeCompare(right.section, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
      return {
        grade,
        sections: sorted,
        studentCount: sorted.reduce(
          (total, item) => total + item.students.length,
          0,
        ),
      };
    });
}
