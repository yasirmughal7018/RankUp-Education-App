import { describe, expect, it } from "vitest";
import { assignModesForRole } from "@/features/quizzes/domain/quizTypes";

function modeValues(role: Parameters<typeof assignModesForRole>[0]): string[] {
  return assignModesForRole(role).map((mode) => mode.value);
}

describe("assignModesForRole", () => {
  it("gives SchoolAdmin school-wide assign without public catalog", () => {
    const modes = modeValues("SchoolAdmin");
    expect(modes).toContain("allinschool");
    expect(modes).not.toContain("public");
    expect(modes).not.toContain("multischool");
  });

  it("gives CampusAdmin campus-scoped bulk modes", () => {
    const modes = modeValues("CampusAdmin");
    expect(modes).toContain("allingrade");
    expect(modes).toContain("allinsection");
    expect(modes).not.toContain("public");
    expect(modes).not.toContain("allinschool");
  });

  it("gives PortalAdmin public and multi-school modes", () => {
    const modes = modeValues("PortalAdmin");
    expect(modes).toContain("public");
    expect(modes).toContain("multischool");
    expect(modes).toContain("allinschool");
  });

  it("gives Parent linked-children assign modes", () => {
    const modes = modeValues("Parent");
    expect(modes).toContain("alllinked");
    expect(modes).toContain("group");
  });

  it("gives Tutor linked-student assign modes without group", () => {
    const modes = modeValues("Tutor");
    expect(modes).toContain("alllinked");
    expect(modes).not.toContain("group");
  });

  it("gives Teacher grade and section bulk modes", () => {
    const modes = modeValues("Teacher");
    expect(modes).toContain("allingrade");
    expect(modes).toContain("allinsection");
    expect(modes).not.toContain("public");
  });

  it("does not expose public assign to Coordinator", () => {
    const modes = modeValues("Coordinator");
    expect(modes).not.toContain("public");
    expect(modes).toContain("selected");
  });
});
