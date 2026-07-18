export type DirectorySectionKey =
  | "schools"
  | "students"
  | "parents"
  | "teachers"
  | "schoolAdmins"
  | "campusAdmins"
  | "schoolChanges";

export interface DirectoryStatusCounts {
  /**
   * Ready only (is_active + password set) — hero "Active" number.
   * NeedsPasswordSetup is a separate state and must not be included.
   * See docs/02_RankUp_User_Creation_Approval_QA.
   */
  active: number;
  activeReady: number;
  pendingApproval: number;
  needsPasswordSetup: number;
  locked: number;
  deactivated: number;
  rejected: number;
  /** Sum of all six mutually exclusive lifecycle states. */
  total: number;
}

export interface DirectorySchoolStatusCounts {
  active: number;
  inactive: number;
  total: number;
}

export const EMPTY_STATUS_COUNTS: DirectoryStatusCounts = {
  active: 0,
  activeReady: 0,
  pendingApproval: 0,
  needsPasswordSetup: 0,
  locked: 0,
  deactivated: 0,
  rejected: 0,
  total: 0,
};

export const EMPTY_SCHOOL_STATUS_COUNTS: DirectorySchoolStatusCounts = {
  active: 0,
  inactive: 0,
  total: 0,
};

export interface DirectorySummary {
  schools: DirectorySchoolStatusCounts;
  students: DirectoryStatusCounts;
  parents: DirectoryStatusCounts;
  teachers: DirectoryStatusCounts;
  schoolAdmins: DirectoryStatusCounts;
  campusAdmins: DirectoryStatusCounts;
  visibleSections: DirectorySectionKey[];
}

export interface DirectorySchool {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
  campusCount: number;
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

/** Lifecycle codes from directory list APIs (QA login-status machine). */
export type DirectoryAccountStatus =
  | "Active"
  | "ApprovedInactive"
  | "PendingApproval"
  | "Locked"
  | "Deactivated"
  | "Rejected";

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
  avatarUrl?: string | null;
  schoolName: string;
  campusName: string;
  teacherNames: string[];
  accountStatus: DirectoryAccountStatus;
}

export interface DirectoryTeacher {
  teacherId: number;
  fullName: string;
  username: string;
  teacherCode: string;
  schoolId: number;
  campusId: number;
  isActive: boolean;
  avatarUrl?: string | null;
  schoolName: string;
  campusName: string;
  studentCount: number;
  accountStatus: DirectoryAccountStatus;
}

export interface DirectoryParent {
  parentId: number;
  fullName: string;
  username: string;
  linkedStudentCount: number;
  isActive: boolean;
  avatarUrl?: string | null;
  accountStatus: DirectoryAccountStatus;
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
  cnic?: string | null;
  mobileNumber?: string | null;
}

export interface DirectorySchoolAdmin {
  userId: number;
  fullName: string;
  username: string;
  schoolId: number;
  schoolName: string;
  mobileNumber: string | null;
  cnic: string | null;
  isActive: boolean;
  needsPasswordSetup: boolean;
  avatarUrl?: string | null;
  activeCampusCount: number;
  activeTeacherCount: number;
  activeStudentCount: number;
  accountStatus: DirectoryAccountStatus;
}

export interface CreateDirectorySchoolAdminInput {
  fullName: string;
  username: string;
  schoolId: number;
  mobileNumber?: string | null;
  cnic?: string | null;
  emailAddress?: string | null;
}

export interface UpdateDirectorySchoolAdminInput {
  fullName: string;
  schoolId: number;
  mobileNumber?: string | null;
  cnic?: string | null;
  emailAddress?: string | null;
}

export interface DirectorySchoolAdminFilters {
  schoolId?: number | null;
  search?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface DirectoryCampusAdmin {
  userId: number;
  fullName: string;
  username: string;
  schoolId: number;
  schoolName: string;
  campusId: number;
  campusName: string;
  mobileNumber: string | null;
  cnic: string | null;
  isActive: boolean;
  needsPasswordSetup: boolean;
  avatarUrl?: string | null;
  activeTeacherCount: number;
  activeStudentCount: number;
  accountStatus: DirectoryAccountStatus;
}

export interface CreateDirectoryCampusAdminInput {
  fullName: string;
  username: string;
  schoolId: number;
  campusId: number;
  mobileNumber?: string | null;
  cnic?: string | null;
  emailAddress?: string | null;
}

export interface UpdateDirectoryCampusAdminInput {
  fullName: string;
  schoolId: number;
  campusId: number;
  mobileNumber?: string | null;
  cnic?: string | null;
  emailAddress?: string | null;
}

export interface DirectoryCampusAdminFilters {
  schoolId?: number | null;
  campusId?: number | null;
  search?: string;
  pageNumber?: number;
  pageSize?: number;
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
