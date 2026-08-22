import { describe, expect, it } from "vitest";
import {
  canApproveQuizzes,
  canAssignAdminAudiences,
  canDeleteOrArchiveQuiz,
  canEditQuizSettings,
  canManageQuizzes,
  canPortalPublishQuiz,
  canReviewQuizApproval,
  canSubmitQuizForReview,
  canViewOrgQuizCatalog,
  defaultQuizListMineOnly,
  formatQuizDisplayStatusLabel,
  hasQuizAssignmentStarted,
  isFinalApprovedQuizStatus,
  isParentPrivateQuizType,
  isQuizMetadataEditable,
  isQuizOwner,
  isRejectedQuizApprovalStatus,
  isSchoolApprovedQuizStatus,
  resolveQuizDisplayStatus,
} from "@/features/quizzes/domain/quizTypes";

describe("quiz list visibility helpers", () => {
  it("org admins see the full scoped catalog", () => {
    expect(canViewOrgQuizCatalog("PortalAdmin")).toBe(true);
    expect(canViewOrgQuizCatalog("SchoolAdmin")).toBe(true);
    expect(canViewOrgQuizCatalog("CampusAdmin")).toBe(true);
    expect(canViewOrgQuizCatalog("Teacher")).toBe(false);
  });

  it("defaults mine-only off for all roles (optional filter)", () => {
    expect(defaultQuizListMineOnly("SchoolAdmin")).toBe(false);
    expect(defaultQuizListMineOnly("PortalAdmin")).toBe(false);
    expect(defaultQuizListMineOnly("CampusAdmin")).toBe(false);
    expect(defaultQuizListMineOnly("Teacher")).toBe(false);
    expect(defaultQuizListMineOnly("Coordinator")).toBe(false);
    expect(defaultQuizListMineOnly(undefined)).toBe(false);
  });
});

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
    expect(canManageQuizzes("CampusAdmin")).toBe(true);
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

describe("canEditQuizSettings", () => {
  const openAssignments = [{ startAt: "2099-01-01T00:00:00Z", attemptCount: 0 }];

  it("allows portal admin on editable published quizzes", () => {
    expect(
      canEditQuizSettings("PortalAdmin", 1, "99", "Published", openAssignments),
    ).toBe(true);
  });

  it("allows the quiz owner on draft quizzes", () => {
    expect(canEditQuizSettings("Teacher", 42, "42", "Draft", [])).toBe(true);
  });

  it("denies non-owner school admins", () => {
    expect(
      canEditQuizSettings("SchoolAdmin", 5, "99", "Draft", []),
    ).toBe(false);
  });

  it("blocks edits once assignments start even for portal admin", () => {
    expect(
      canEditQuizSettings("PortalAdmin", 1, "99", "Published", [
        { startAt: "2020-01-01T00:00:00Z", attemptCount: 0 },
      ]),
    ).toBe(false);
  });
});

describe("isQuizOwner", () => {
  it("matches string and numeric user ids", () => {
    expect(isQuizOwner(42, "42")).toBe(true);
    expect(isQuizOwner("42", "42")).toBe(true);
    expect(isQuizOwner(43, "42")).toBe(false);
  });
});

describe("canDeleteOrArchiveQuiz", () => {
  it("allows portal admin for pending published teacher quizzes", () => {
    expect(
      canDeleteOrArchiveQuiz(
        "PortalAdmin",
        1,
        "99",
        "Published",
        "Pending",
        "Practice",
      ),
    ).toBe(true);
  });

  it("allows teacher owner on approved published quizzes", () => {
    expect(
      canDeleteOrArchiveQuiz(
        "Teacher",
        42,
        "42",
        "Published",
        "Approved",
        "Practice",
      ),
    ).toBe(true);
  });

  it("denies teacher owner on published pending quizzes", () => {
    expect(
      canDeleteOrArchiveQuiz(
        "Teacher",
        42,
        "42",
        "Published",
        "Pending",
        "Practice",
      ),
    ).toBe(false);
  });

  it("denies parent owner on parent private quizzes", () => {
    expect(
      canDeleteOrArchiveQuiz(
        "Parent",
        42,
        "42",
        "Draft",
        "Pending",
        "ParentPrivate",
      ),
    ).toBe(false);
  });
});

describe("canReviewQuizApproval", () => {
  it("limits parent private quizzes to portal admin", () => {
    expect(canReviewQuizApproval("PortalAdmin", "ParentPrivate")).toBe(true);
    expect(canReviewQuizApproval("SchoolAdmin", "ParentPrivate")).toBe(false);
    expect(canReviewQuizApproval("SchoolAdmin", "Practice")).toBe(true);
  });
});

describe("resolveQuizDisplayStatus", () => {
  it("shows Approval Pending after submit when draft lifecycle and pending approval", () => {
    expect(resolveQuizDisplayStatus("Draft", "Pending", 3)).toBe(
      "Approval Pending",
    );
    expect(resolveQuizDisplayStatus("Draft", "Pending", 0)).toBe("Draft");
    expect(formatQuizDisplayStatusLabel("approval pending")).toBe(
      "Approval Pending",
    );
  });
});

describe("canSubmitQuizForReview", () => {
  it("requires draft, questions, editable settings, and ownership", () => {
    expect(
      canSubmitQuizForReview("Teacher", 42, "42", "Draft", 3, true),
    ).toBe(true);
    expect(
      canSubmitQuizForReview("SchoolAdmin", 42, "42", "Draft", 3, true),
    ).toBe(true);
    expect(
      canSubmitQuizForReview("Teacher", 42, "99", "Draft", 3, true),
    ).toBe(false);
    expect(
      canSubmitQuizForReview("CampusAdmin", 42, "42", "Draft", 3, true),
    ).toBe(false);
    expect(
      canSubmitQuizForReview("Teacher", 42, "42", "Published", 3, true),
    ).toBe(false);
    expect(
      canSubmitQuizForReview("Teacher", 42, "42", "Draft", 0, true),
    ).toBe(false);
  });
});

describe("canPortalPublishQuiz", () => {
  it("allows portal admin to publish school-approved teacher drafts", () => {
    expect(
      canPortalPublishQuiz("PortalAdmin", "Draft", "SchoolApproved", "Practice"),
    ).toBe(true);
    expect(
      canPortalPublishQuiz("PortalAdmin", "Draft", "Pending", "Practice"),
    ).toBe(false);
  });

  it("allows portal admin to publish pending parent private drafts", () => {
    expect(
      canPortalPublishQuiz("PortalAdmin", "Draft", "Pending", "ParentPrivate"),
    ).toBe(true);
  });
});
