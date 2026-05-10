import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { setActiveSourceView } from "./active-source-view";
import {
  type Heading,
  jumpToSourceLine,
  nextHeadingFrom,
  parseHeadings,
  prevHeadingFrom,
} from "./headings";

afterEach(() => setActiveSourceView(null));

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
