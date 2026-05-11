import { describe, expect, it } from "vitest";
import { shiftAllHeadings } from "./shift-headings";

describe("shiftAllHeadings", () => {
  it("demotes all headings by 1", () => {
    expect(shiftAllHeadings("# Top\n## Mid\nbody", 1)).toBe("## Top\n### Mid\nbody");
  });

  it("promotes all headings by 1", () => {
    expect(shiftAllHeadings("## Mid\n### Sub", -1)).toBe("# Mid\n## Sub");
  });

  it("leaves H6 unchanged when demoting", () => {
    expect(shiftAllHeadings("###### floor\n# Top", 1)).toBe("###### floor\n## Top");
  });

  it("leaves H1 unchanged when promoting", () => {
    expect(shiftAllHeadings("# ceiling\n## A", -1)).toBe("# ceiling\n# A");
  });

  it("returns input unchanged for delta=0", () => {
    expect(shiftAllHeadings("# A\n## B", 0)).toBe("# A\n## B");
  });

  it("returns input unchanged for empty input", () => {
    expect(shiftAllHeadings("", 1)).toBe("");
  });

  it("skips lines inside fenced code blocks", () => {
    const input = "# Top\n```\n# not a heading\n```\n## Real";
    const expected = "## Top\n```\n# not a heading\n```\n### Real";
    expect(shiftAllHeadings(input, 1)).toBe(expected);
  });

  it("preserves leading indent on the heading", () => {
    expect(shiftAllHeadings("  # indented\n", 1)).toBe("  ## indented\n");
  });

  it("does not touch lines that aren't headings", () => {
    // "#hashtag" has no space after the hashes — not a heading.
    const input = "regular text\n# Heading\n#hashtag";
    expect(shiftAllHeadings(input, 1)).toBe("regular text\n## Heading\n#hashtag");
  });

  it("does not affect setext-style headings", () => {
    const input = "Top\n===\n## Sub";
    expect(shiftAllHeadings(input, 1)).toBe("Top\n===\n### Sub");
  });
});
