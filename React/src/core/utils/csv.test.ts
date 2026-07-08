import { describe, expect, it } from "vitest";
import { escapeCsvValue, toCsv } from "@/core/utils/csv";

describe("csv helpers", () => {
  it("escapes commas, quotes, and newlines", () => {
    expect(escapeCsvValue("plain")).toBe("plain");
    expect(escapeCsvValue("a,b")).toBe('"a,b"');
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvValue("line\nbreak")).toBe('"line\nbreak"');
    expect(escapeCsvValue(null)).toBe("");
    expect(escapeCsvValue(42)).toBe("42");
  });

  it("builds a csv document with headers and rows", () => {
    const csv = toCsv(
      ["Name", "Score"],
      [
        ["Ali", 90],
        ["Sara, A", null],
      ],
    );

    expect(csv).toBe('Name,Score\nAli,90\n"Sara, A",\n');
  });
});
