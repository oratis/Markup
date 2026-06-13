import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { setActiveSourceView } from "./active-source-view";
import {
  type Heading,
  headingBreadcrumb,
  headingLineIndex,
  jumpToSourceLine,
  nextHeadingFrom,
  parseHeadings,
  prevHeadingFrom,
} from "./headings";

afterEach(() => setActiveSourceView(null));

describe("headingLineIndex", () => {
  const doc = "# Top\n\nintro\n\n## Setup steps\n\nbody\n\n### Notes ##\n";
  it("finds an ATX heading by trimmed text, returning its 0-based line", () => {
    expect(headingLineIndex(doc, "Setup steps")).toBe(4);
    expect(headingLineIndex(doc, "  Setup steps  ")).toBe(4);
  });
  it("ignores trailing closing hashes", () => {
    expect(headingLineIndex(doc, "Notes")).toBe(8);
  });
  it("returns -1 when there's no match or an empty query", () => {
    expect(headingLineIndex(doc, "Nope")).toBe(-1);
    expect(headingLineIndex(doc, "")).toBe(-1);
  });
});

const SAMPLE = `# Top

intro

## Section A

\`\`\`
# fake heading
\`\`\`

### Sub A

## Section B
`;

describe("parseHeadings", () => {
  it("extracts ATX headings with correct levels and 0-based line numbers", () => {
    const h = parseHeadings(SAMPLE);
    expect(h.map((x) => x.text)).toEqual(["Top", "Section A", "Sub A", "Section B"]);
    expect(h.map((x) => x.level)).toEqual([1, 2, 3, 2]);
  });

  it("ignores heading-like lines inside fenced code blocks", () => {
    const h = parseHeadings(SAMPLE);
    expect(h.map((x) => x.text)).not.toContain("fake heading");
  });

  it("extracts setext-style headings", () => {
    const md = "Title\n=====\n\nSubtitle\n--------\n";
    const h = parseHeadings(md);
    expect(h).toEqual<Heading[]>([
      { level: 1, text: "Title", line: 0 },
      { level: 2, text: "Subtitle", line: 3 },
    ]);
  });
});

describe("headingBreadcrumb", () => {
  const HEADS: Heading[] = [
    { level: 1, text: "Top", line: 0 },
    { level: 2, text: "Sec A", line: 5 },
    { level: 3, text: "Sub A1", line: 10 },
    { level: 3, text: "Sub A2", line: 20 },
    { level: 2, text: "Sec B", line: 30 },
  ];

  it("returns the chain of ancestors of the cursor's section", () => {
    expect(headingBreadcrumb(HEADS, 12).map((h) => h.text)).toEqual([
      "Top",
      "Sec A",
      "Sub A1",
    ]);
    expect(headingBreadcrumb(HEADS, 21).map((h) => h.text)).toEqual([
      "Top",
      "Sec A",
      "Sub A2",
    ]);
  });

  it("pops sibling headings of equal or shallower level", () => {
    expect(headingBreadcrumb(HEADS, 31).map((h) => h.text)).toEqual(["Top", "Sec B"]);
  });

  it("returns an empty list when the cursor is before any heading", () => {
    expect(headingBreadcrumb(HEADS, 0).map((h) => h.text)).toEqual(["Top"]);
    expect(headingBreadcrumb([], 0)).toEqual([]);
  });
});

describe("nextHeadingFrom / prevHeadingFrom", () => {
  const HEADS: Heading[] = [
    { level: 1, text: "A", line: 0 },
    { level: 2, text: "B", line: 5 },
    { level: 3, text: "C", line: 10 },
  ];

  it("nextHeadingFrom returns the first heading strictly after the cursor", () => {
    expect(nextHeadingFrom(HEADS, 4)?.text).toBe("B");
    expect(nextHeadingFrom(HEADS, 5)?.text).toBe("C");
    expect(nextHeadingFrom(HEADS, 99)).toBeNull();
  });

  it("prevHeadingFrom returns the last heading strictly before the cursor", () => {
    expect(prevHeadingFrom(HEADS, 5)?.text).toBe("A");
    expect(prevHeadingFrom(HEADS, 11)?.text).toBe("C");
    expect(prevHeadingFrom(HEADS, 0)).toBeNull();
  });
});

describe("jumpToSourceLine", () => {
  it("returns false when no source view is active", () => {
    expect(jumpToSourceLine(0)).toBe(false);
  });

  it("moves the active view's caret to the given line and returns true", () => {
    const view = new EditorView({
      state: EditorState.create({ doc: "alpha\nbeta\ngamma" }),
    });
    setActiveSourceView(view);
    expect(jumpToSourceLine(2)).toBe(true);
    // Line 2 (0-based) is "gamma" — cursor should be at its start (pos 11).
    expect(view.state.selection.main.head).toBe(11);
  });
});

describe("parseHeadings — frontmatter & Setext false positives (regression)", () => {
  it("does not emit a phantom heading from the frontmatter close", () => {
    const md = "---\ntitle: Hello\nauthor: me\n---\n# Real";
    expect(parseHeadings(md).map((h) => h.text)).toEqual(["Real"]);
  });
  it("treats --- after an ATX heading as a break, not Setext", () => {
    expect(parseHeadings("# Title\n---\ntext").map((h) => h.text)).toEqual(["Title"]);
  });
  it("treats --- after a list item as a break, not Setext", () => {
    expect(parseHeadings("- item\n---\ntext")).toEqual([]);
  });
  it("still recognises a real Setext heading", () => {
    expect(parseHeadings("My Heading\n---\ntext")).toEqual([
      { level: 2, text: "My Heading", line: 0 },
    ]);
  });
});
