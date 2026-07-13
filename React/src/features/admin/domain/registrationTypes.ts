import type { UserRole } from "@/core/api/types";

export interface PendingApprover {
  userId: number;
  fullName: string;
  username: string;
  role: string;
}

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
  rollNumberTeacherCode: string | null;
  pendingApprovers: PendingApprover[];
  /** True when this admin already approved and the request still awaits Portal Admin. */
  currentUserHasApproved: boolean;
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
