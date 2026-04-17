import { describe, it, expect } from "vitest";
import { csvRow } from "@/lib/csv";

describe("csvRow", () => {
  it("quotes fields with commas", () => {
    expect(csvRow(["a", "b,c", "d"])).toBe('a,"b,c",d');
  });
  it("escapes quotes inside quoted fields", () => {
    expect(csvRow(['he said "hi"'])).toBe('"he said ""hi"""');
  });
  it("preserves empty fields", () => {
    expect(csvRow(["", "x"])).toBe(",x");
  });
});
