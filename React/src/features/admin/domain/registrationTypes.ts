import type { CurrentUser, UserRole } from "@/core/api/types";

export interface PendingRegistration {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  requestedAt: string | null;
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

export function getDefaultApprovalValues(user: CurrentUser | null) {
  return {
    schoolId: user?.schoolId ?? "",
    campusId: user?.campusId ?? "",
    section: "A",
  };
}
