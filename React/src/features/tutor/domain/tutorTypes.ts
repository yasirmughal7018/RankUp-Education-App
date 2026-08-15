export interface TutorLinkedStudent {
  studentId: number;
  fullName: string;
  username: string;
  rollNumber: string;
  grade: number;
  section: string;
  schoolName?: string | null;
}

export interface LinkTutorStudentInput {
  identifier: string;
}

export interface LinkTutorStudentResult extends TutorLinkedStudent {
  alreadyLinked: boolean;
}

export function formatTutorStudentLabel(student: TutorLinkedStudent): string {
  const gradeSection = [
    student.grade > 0 ? `Grade ${student.grade}` : null,
    student.section || null,
  ]
    .filter(Boolean)
    .join("");
  return gradeSection
    ? `${student.fullName} (${gradeSection})`
    : student.fullName;
}
