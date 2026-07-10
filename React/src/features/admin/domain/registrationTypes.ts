import type { UserRole } from "@/core/api/types";

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
  rollNumberTeacherCode: string | null;
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
