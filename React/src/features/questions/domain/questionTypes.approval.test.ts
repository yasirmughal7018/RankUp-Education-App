import { describe, expect, it } from "vitest";
import { canApproveOrRejectQuestion } from "@/features/questions/domain/questionTypes";

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
