import { describe, expect, it } from "vitest";
import { canApproveOrRejectQuestion, canMutateQuestion, canRequestQuestionEdit } from "@/features/questions/domain/questionTypes";

describe("canApproveOrRejectQuestion", () => {
  it("hides endorse on a CampusAdmin's own question", () => {
    expect(
      canApproveOrRejectQuestion({
        role: "CampusAdmin",
        userId: 12,
        createdBy: "12",
      }),
    ).toBe(false);
  });

  it("hides endorse on a SchoolAdmin's own question", () => {
    expect(
      canApproveOrRejectQuestion({
        role: "SchoolAdmin",
        userId: 8,
        createdBy: "8",
      }),
    ).toBe(false);
  });

  it("allows CampusAdmin to endorse someone else's question", () => {
    expect(
      canApproveOrRejectQuestion({
        role: "CampusAdmin",
        userId: 12,
        createdBy: "44",
      }),
    ).toBe(true);
  });

  it("allows PortalAdmin to publish their own question", () => {
    expect(
      canApproveOrRejectQuestion({
        role: "PortalAdmin",
        userId: 1,
        createdBy: "1",
      }),
    ).toBe(true);
  });

  it("does not let a Teacher endorse", () => {
    expect(
      canApproveOrRejectQuestion({
        role: "Teacher",
        userId: 9,
        createdBy: "44",
      }),
    ).toBe(false);
  });
});

describe("canMutateQuestion", () => {
  it("lets a Teacher edit their own PendingReview question", () => {
    expect(
      canMutateQuestion({
        role: "Teacher",
        userId: 9,
        createdBy: "9",
        status: "PendingReview",
      }),
    ).toBe(true);
  });

  it("blocks a Teacher from editing an Active Approved question without a grant", () => {
    expect(
      canMutateQuestion({
        role: "Teacher",
        userId: 9,
        createdBy: "9",
        status: "Approved",
      }),
    ).toBe(false);
  });

  it("lets a Teacher edit an Active question when they have an unused grant", () => {
    expect(
      canMutateQuestion({
        role: "Teacher",
        userId: 9,
        createdBy: "44",
        status: "Approved",
        hasApprovedEditGrant: true,
      }),
    ).toBe(true);
  });
});

describe("canRequestQuestionEdit", () => {
  it("lets a Teacher request an edit on an Active question", () => {
    expect(
      canRequestQuestionEdit({
        role: "Teacher",
        isActive: true,
      }),
    ).toBe(true);
  });

  it("hides the request action for PortalAdmin", () => {
    expect(
      canRequestQuestionEdit({
        role: "PortalAdmin",
        isActive: true,
      }),
    ).toBe(false);
  });

  it("hides the request action while a request is pending", () => {
    expect(
      canRequestQuestionEdit({
        role: "Teacher",
        isActive: true,
        myEditRequestStatus: "Pending",
      }),
    ).toBe(false);
  });
});
