import { describe, expect, it } from "vitest";
import {
  assignModesForRole,
  defaultAssignModeForRole,
} from "@/features/quizzes/domain/quizTypes";

function modeValues(role: Parameters<typeof assignModesForRole>[0]): string[] {
  return assignModesForRole(role).map((mode) => mode.value);
}

describe("assignModesForRole", () => {
  it("gives Parent linked children plus selected and group", () => {
    const modes = modeValues("Parent");
    expect(modes).toEqual(["one", "selected", "group", "alllinked"]);
    expect(defaultAssignModeForRole("Parent")).toBe("alllinked");
  });

  it("gives Teacher assigned classes plus selected and group", () => {
    const modes = modeValues("Teacher");
    expect(modes).toContain("allattached");
    expect(modes).toContain("selected");
    expect(modes).toContain("group");
    expect(modes).toContain("allingrade");
    expect(modes).toContain("allinsection");
    expect(modes).not.toContain("allinschool");
    expect(modes).not.toContain("public");
    expect(defaultAssignModeForRole("Teacher")).toBe("allattached");
  });

  it("gives Coordinator attached classes plus selected and group", () => {
    const modes = modeValues("Coordinator");
    expect(modes).toContain("allattached");
    expect(modes).toContain("selected");
    expect(modes).toContain("group");
    expect(modes).not.toContain("allinschool");
    expect(modes).not.toContain("public");
    expect(defaultAssignModeForRole("Coordinator")).toBe("allattached");
  });

  it("gives CampusAdmin whole campus plus selected and group", () => {
    const modes = modeValues("CampusAdmin");
    expect(modes).toContain("allincampus");
    expect(modes).toContain("selected");
    expect(modes).toContain("group");
    expect(modes).toContain("allingrade");
    expect(modes).not.toContain("allinschool");
    expect(modes).not.toContain("public");
    expect(defaultAssignModeForRole("CampusAdmin")).toBe("allincampus");
  });

  it("gives SchoolAdmin whole school plus selected, group, and campus", () => {
    const modes = modeValues("SchoolAdmin");
    expect(modes).toContain("allinschool");
    expect(modes).toContain("allincampus");
    expect(modes).toContain("selected");
    expect(modes).toContain("group");
    expect(modes).not.toContain("public");
    expect(modes).not.toContain("multischool");
    expect(defaultAssignModeForRole("SchoolAdmin")).toBe("allinschool");
  });

  it("gives PortalAdmin every audience including public and multi-school", () => {
    const modes = modeValues("PortalAdmin");
    expect(modes).toContain("selected");
    expect(modes).toContain("group");
    expect(modes).toContain("allincampus");
    expect(modes).toContain("allinschool");
    expect(modes).toContain("multischool");
    expect(modes).toContain("public");
    expect(defaultAssignModeForRole("PortalAdmin")).toBe("selected");
  });
});
