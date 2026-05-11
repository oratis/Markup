import { describe, expect, it } from "vitest";
import { collapseBlankLines } from "./collapse-blanks";

describe("collapseBlankLines", () => {
  it("collapses 3 newlines down to 2 between paragraphs", () => {
    expect(collapseBlankLines("Para A\n\n\nPara B")).toBe("Para A\n\nPara B");
  });

  it("collapses any longer run to a single blank line", () => {
    expect(collapseBlankLines("A\n\n\n\n\nB")).toBe("A\n\nB");
  });

  it("leaves a single blank line untouched", () => {
    expect(collapseBlankLines("A\n\nB")).toBe("A\n\nB");
  });

  it("returns empty input unchanged", () => {
    expect(collapseBlankLines("")).toBe("");
  });

  it("treats whitespace-only lines as blanks", () => {
    expect(collapseBlankLines("A\n   \n\t\nB")).toBe("A\n   \nB");
  });

  it("preserves blank lines INSIDE fenced code blocks", () => {
    const input = "before\n\n```\ndef foo():\n\n\n    pass\n```\nafter";
    expect(collapseBlankLines(input)).toBe(input);
  });

  it("still collapses blanks outside the fence even when fences are present", () => {
    const input = "A\n\n\n\n```\ncode\n```\n\n\n\nB";
    expect(collapseBlankLines(input)).toBe("A\n\n```\ncode\n```\n\nB");
  });

  it("caps a trailing blank-line run at one", () => {
    expect(collapseBlankLines("foo\n\n\n")).toBe("foo\n");
  });

  it("caps a leading blank-line run at one", () => {
    expect(collapseBlankLines("\n\n\nfoo")).toBe("\nfoo");
  });

  it("supports tilde-style fences too", () => {
    const input = "x\n\n~~~\n\n\n~~~\n\n\ny";
    expect(collapseBlankLines(input)).toBe("x\n\n~~~\n\n\n~~~\n\ny");
  });
});
