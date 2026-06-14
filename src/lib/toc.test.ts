import { describe, expect, it } from "vitest";
import type { Heading } from "./headings";
import { buildToc, ghSlug, headingForAnchor } from "./toc";

const Hd = (level: number, text: string, line: number): Heading => ({
  level,
  text,
  line,
});

describe("headingForAnchor", () => {
  const headings = [
    Hd(1, "Overview", 0),
    Hd(2, "Design decisions", 4),
    Hd(2, "Design decisions", 9), // duplicate → second gets -1
    Hd(2, "中文 标题", 14),
  ];

  it("matches a heading by its GitHub-style slug", () => {
    expect(headingForAnchor(headings, "design-decisions")?.line).toBe(4);
    expect(headingForAnchor(headings, "overview")?.level).toBe(1);
  });

  it("resolves duplicate-slug -N suffixes", () => {
    expect(headingForAnchor(headings, "design-decisions-1")?.line).toBe(9);
  });

  it("matches non-ASCII slugs and is case-insensitive", () => {
    expect(headingForAnchor(headings, "中文-标题")?.line).toBe(14);
    expect(headingForAnchor(headings, "OVERVIEW")?.line).toBe(0);
  });

  it("returns null for an unknown or empty fragment", () => {
    expect(headingForAnchor(headings, "nope")).toBeNull();
    expect(headingForAnchor(headings, "")).toBeNull();
  });
});

describe("ghSlug", () => {
  it("lowercases", () => {
    expect(ghSlug("Hello")).toBe("hello");
  });

  it("strips punctuation", () => {
    expect(ghSlug("Hello, World!")).toBe("hello-world");
  });

  it("collapses whitespace into single hyphens", () => {
    expect(ghSlug("hello   world  foo")).toBe("hello-world-foo");
  });

  it("preserves unicode letters", () => {
    expect(ghSlug("中文 标题")).toBe("中文-标题");
  });

  it("returns empty for non-letter input", () => {
    expect(ghSlug("!!!???")).toBe("");
  });
});

describe("buildToc", () => {
  it("returns empty string for no headings", () => {
    expect(buildToc([])).toBe("");
  });

  it("flattens H1-only headings without indent", () => {
    const headings: Heading[] = [
      { level: 1, text: "Intro", line: 0 },
      { level: 1, text: "Setup", line: 5 },
    ];
    expect(buildToc(headings)).toBe("- [Intro](#intro)\n- [Setup](#setup)");
  });

  it("indents nested headings by 2 spaces per level", () => {
    const headings: Heading[] = [
      { level: 1, text: "Top", line: 0 },
      { level: 2, text: "Mid", line: 2 },
      { level: 3, text: "Leaf", line: 4 },
    ];
    expect(buildToc(headings)).toBe(
      "- [Top](#top)\n  - [Mid](#mid)\n    - [Leaf](#leaf)",
    );
  });

  it("normalises indent when the doc starts at H2", () => {
    const headings: Heading[] = [
      { level: 2, text: "A", line: 0 },
      { level: 3, text: "B", line: 1 },
    ];
    expect(buildToc(headings)).toBe("- [A](#a)\n  - [B](#b)");
  });

  it("suffixes duplicate slugs with -1, -2, …", () => {
    const headings: Heading[] = [
      { level: 1, text: "Section", line: 0 },
      { level: 1, text: "Section", line: 5 },
      { level: 1, text: "Section", line: 10 },
    ];
    expect(buildToc(headings)).toBe(
      "- [Section](#section)\n- [Section](#section-1)\n- [Section](#section-2)",
    );
  });

  it("does not affect display text — anchor only", () => {
    const headings: Heading[] = [{ level: 1, text: "Hello, World!", line: 0 }];
    expect(buildToc(headings)).toBe("- [Hello, World!](#hello-world)");
  });
});
