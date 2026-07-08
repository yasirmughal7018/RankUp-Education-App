import { describe, expect, it } from "vitest";
import { canViewReports } from "@/features/reports/domain/reportTypes";

describe("canViewReports", () => {
  it("allows admin and teacher roles", () => {
    expect(canViewReports("SuperAdmin")).toBe(true);
    expect(canViewReports("SchoolAdmin")).toBe(true);
    expect(canViewReports("Teacher")).toBe(true);
  });

  it("denies student, parent, and unknown roles", () => {
    expect(canViewReports("Student")).toBe(false);
    expect(canViewReports("Parent")).toBe(false);
    expect(canViewReports("")).toBe(false);
    expect(canViewReports("Guest")).toBe(false);
  });
});
