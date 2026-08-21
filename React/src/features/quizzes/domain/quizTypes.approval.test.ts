import { describe, expect, it } from "vitest";
import {
  canApproveQuizzes,
  canAssignAdminAudiences,
  canManageQuizzes,
  hasQuizAssignmentStarted,
  isFinalApprovedQuizStatus,
  isQuizMetadataEditable,
  isRejectedQuizApprovalStatus,
  isSchoolApprovedQuizStatus,
} from "@/features/quizzes/domain/quizTypes";

describe("canApproveQuizzes", () => {
  it("allows school, campus, and portal admins", () => {
    expect(canApproveQuizzes("SchoolAdmin")).toBe(true);
    expect(canApproveQuizzes("CampusAdmin")).toBe(true);
    expect(canApproveQuizzes("PortalAdmin")).toBe(true);
  });

  it("denies teachers and parents", () => {
    expect(canApproveQuizzes("Teacher")).toBe(false);
    expect(canApproveQuizzes("Parent")).toBe(false);
  });
});

describe("canManageQuizzes", () => {
  it("includes coordinator and tutor alongside teacher roles", () => {
    expect(canManageQuizzes("Coordinator")).toBe(true);
    expect(canManageQuizzes("Tutor")).toBe(true);
    expect(canManageQuizzes("Teacher")).toBe(true);
    expect(canManageQuizzes("Parent")).toBe(true);
  });

  it("excludes campus admin from manage hub", () => {
    expect(canManageQuizzes("CampusAdmin")).toBe(false);
  });
});

describe("canAssignAdminAudiences", () => {
  it("allows school and portal admins only", () => {
    expect(canAssignAdminAudiences("SchoolAdmin")).toBe(true);
    expect(canAssignAdminAudiences("PortalAdmin")).toBe(true);
    expect(canAssignAdminAudiences("CampusAdmin")).toBe(false);
    expect(canAssignAdminAudiences("Teacher")).toBe(false);
  });
});

describe("approval status helpers", () => {
  it("recognizes school-approved and final-approved states", () => {
    expect(isSchoolApprovedQuizStatus("SchoolApproved")).toBe(true);
    expect(isSchoolApprovedQuizStatus("School Approved")).toBe(true);
    expect(isFinalApprovedQuizStatus("Approved")).toBe(true);
    expect(isFinalApprovedQuizStatus("approved")).toBe(true);
  });

  it("recognizes rejected aliases", () => {
    expect(isRejectedQuizApprovalStatus("Rejected")).toBe(true);
    expect(isRejectedQuizApprovalStatus("Declined")).toBe(true);
    expect(isRejectedQuizApprovalStatus("Approved")).toBe(false);
  });
});

describe("isQuizMetadataEditable", () => {
  it("allows draft regardless of assignments", () => {
    expect(
      isQuizMetadataEditable("Draft", [
        { startAt: "2020-01-01T00:00:00Z", attemptCount: 3 },
      ]),
    ).toBe(true);
  });

  it("blocks published quiz once an assignment window opens", () => {
    expect(
      isQuizMetadataEditable("Published", [
        { startAt: "2020-01-01T00:00:00Z", attemptCount: 0 },
      ]),
    ).toBe(false);
  });

  it("allows published quiz before any assignment starts", () => {
    expect(
      isQuizMetadataEditable("Published", [
        { startAt: "2099-01-01T00:00:00Z", attemptCount: 0 },
      ]),
    ).toBe(true);
  });
});

describe("hasQuizAssignmentStarted", () => {
  it("returns true when any attempt exists even before start", () => {
    expect(
      hasQuizAssignmentStarted(
        [{ startAt: "2099-01-01T00:00:00Z", attemptCount: 1 }],
        Date.parse("2026-01-01T00:00:00Z"),
      ),
    ).toBe(true);
  });
});
