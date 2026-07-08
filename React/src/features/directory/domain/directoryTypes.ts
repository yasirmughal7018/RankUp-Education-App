export interface DirectorySchool {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
}

export interface UpsertSchoolInput {
  name: string;
  code: string;
  isActive: boolean;
}

export interface DirectoryCampus {
  id: number;
  schoolId: number;
  name: string;
  address: string | null;
  isActive: boolean;
}

export interface UpsertCampusInput {
  name: string;
  address?: string | null;
  isActive: boolean;
}

export interface DirectoryStudent {
  studentId: number;
  fullName: string;
  username: string;
  rollNumber: string;
  grade: number;
  section: string;
  schoolId: number;
  campusId: number;
  isActive: boolean;
}

export interface DirectoryTeacher {
  teacherId: number;
  fullName: string;
  username: string;
  teacherCode: string;
  schoolId: number;
  campusId: number;
  isActive: boolean;
}

export interface DirectoryParent {
  parentId: number;
  fullName: string;
  username: string;
  linkedStudentCount: number;
  isActive: boolean;
}

export interface LinkParentStudentInput {
  studentId: number;
  relationship?: string;
}

export interface LinkParentStudentResult {
  parentId: number;
  studentId: number;
  relationship: string;
  isActive: boolean;
}

export interface DirectoryStudentFilters {
  schoolId?: number | null;
  campusId?: number | null;
  grade?: number | null;
  search?: string;
}

export interface DirectoryTeacherFilters {
  schoolId?: number | null;
  campusId?: number | null;
  search?: string;
}
