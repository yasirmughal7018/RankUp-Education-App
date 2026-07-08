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

export interface PagedDirectoryResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
}

export interface CreateDirectoryStudentInput {
  fullName: string;
  username: string;
  password: string;
  schoolId: number;
  campusId: number;
  rollNumber: string;
  grade: number;
  section: string;
  mobileNumber?: string | null;
}

export interface UpdateDirectoryStudentInput {
  fullName: string;
  campusId: number;
  rollNumber: string;
  grade: number;
  section: string;
  mobileNumber?: string | null;
}

export interface CreateDirectoryTeacherInput {
  fullName: string;
  username: string;
  password: string;
  schoolId: number;
  campusId: number;
  teacherCode: string;
  mobileNumber?: string | null;
}

export interface UpdateDirectoryTeacherInput {
  fullName: string;
  campusId: number;
  teacherCode: string;
  mobileNumber?: string | null;
}

export interface CreateDirectoryParentInput {
  fullName: string;
  username: string;
  password: string;
  cnic?: string | null;
  mobileNumber?: string | null;
}

export interface UpdateDirectoryParentInput {
  fullName: string;
  cnic?: string | null;
  mobileNumber?: string | null;
}

export interface BulkDeactivateInput {
  ids: number[];
}

export interface BulkActionResult {
  affectedCount: number;
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

export type ActiveStatusFilter = "all" | "active" | "inactive";

export interface DirectoryPaging {
  pageNumber?: number;
  pageSize?: number;
}

export interface DirectoryStudentFilters extends DirectoryPaging {
  schoolId?: number | null;
  campusId?: number | null;
  grade?: number | null;
  search?: string;
}

export interface DirectoryTeacherFilters extends DirectoryPaging {
  schoolId?: number | null;
  campusId?: number | null;
  search?: string;
}

export interface DirectoryParentFilters extends DirectoryPaging {
  search?: string;
}
