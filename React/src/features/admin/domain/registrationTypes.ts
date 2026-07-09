import type { CurrentUser, UserRole } from "@/core/api/types";

export interface PendingRegistration {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  requestedAt: string | null;
  mobileNumber: string | null;
  emailAddress: string | null;
  cnic: string | null;
  schoolId: number | null;
  campusId: number | null;
  createdDate: string | null;
  reasonMessage: string | null;
  adminTarget: string | null;
  schoolCampusName: string | null;
  studentOrEmployeeId: string | null;
}

export interface ApproveRegistrationRequest {
  password: string;
  schoolId?: number | null;
  campusId?: number | null;
  studentRollNumber?: string | null;
  grade?: number | null;
  section?: string | null;
  teacherCode?: string | null;
  mobileNumber?: string | null;
  cnic?: string | null;
}

export type RegistrationActionRole = Extract<
  UserRole,
  "Student" | "Teacher" | "Parent"
>;

export function isRegistrationActionRole(
  role: UserRole,
): role is RegistrationActionRole {
  return role === "Student" || role === "Teacher" || role === "Parent";
}

export function getDefaultApprovalValues(
  registration: PendingRegistration,
  user: CurrentUser | null,
) {
  return {
    schoolId: registration.schoolId ?? user?.schoolId ?? "",
    campusId: registration.campusId ?? user?.campusId ?? "",
    mobileNumber: registration.mobileNumber ?? registration.username,
    cnic: registration.cnic ?? "",
    studentOrEmployeeId: registration.studentOrEmployeeId ?? "",
    section: "A",
  };
}
