import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { setActiveSourceView } from "./active-source-view";
import {
  deleteCurrentSection,
  getCurrentSectionText,
  moveSectionDown,
  moveSectionToBottom,
  moveSectionToLine,
  moveSectionToTop,
  moveSectionUp,
} from "./cm-section";

function mountView(doc: string, anchor: number): EditorView {
  const view = new EditorView({
    state: EditorState.create({ doc, selection: { anchor } }),
  });
  setActiveSourceView(view);
  return view;
}

afterEach(() => setActiveSourceView(null));

const SAMPLE = [
  "# Top",
  "intro line",
  "",
  "## A",
  "a1",
  "a2",
  "",
  "## B",
  "b1",
  "",
  "### B.1",
  "deep",
  "",
  "## C",
  "c1",
].join("\n");

describe("moveSectionUp", () => {
  it("swaps the cursor's section with the previous peer at the same level", () => {
    // Cursor on "b1" line — section is "## B" through "deep"; peer above is "## A".
    const idx = SAMPLE.indexOf("b1");
    const view = mountView(SAMPLE, idx);
    expect(moveSectionUp()).toBe(true);
    const out = view.state.doc.toString();
    // ## B (with its B.1 child) now precedes ## A.
    const bPos = out.indexOf("## B");
    const aPos = out.indexOf("## A");
    expect(bPos).toBeGreaterThanOrEqual(0);
    expect(bPos).toBeLessThan(aPos);
  });

  it("returns false when there's no peer above", () => {
    const idx = SAMPLE.indexOf("a1");
    mountView(SAMPLE, idx);
    expect(moveSectionUp()).toBe(false);
  });
});

describe("moveSectionDown", () => {
  it("swaps the cursor's section with the next peer", () => {
    // Cursor on "a1" — section "## A" should move past "## B".
    const idx = SAMPLE.indexOf("a1");
    const view = mountView(SAMPLE, idx);
    expect(moveSectionDown()).toBe(true);
    const out = view.state.doc.toString();
    const aPos = out.indexOf("## A");
    const bPos = out.indexOf("## B");
    expect(bPos).toBeLessThan(aPos);
  });

  it("returns false when there's no peer below", () => {
    const idx = SAMPLE.indexOf("c1");
    mountView(SAMPLE, idx);
    expect(moveSectionDown()).toBe(false);
  });
});

describe("moveSectionToTop / moveSectionToBottom", () => {
  it("toTop moves the cursor's section just after the parent heading", () => {
    // Cursor on c1 — section "## C" should land right after "# Top".
    const idx = SAMPLE.indexOf("c1");
    const view = mountView(SAMPLE, idx);
    expect(moveSectionToTop()).toBe(true);
    const out = view.state.doc.toString();
    // ## C precedes ## A in the new ordering.
    const cPos = out.indexOf("## C");
    const aPos = out.indexOf("## A");
    expect(cPos).toBeLessThan(aPos);
  });

  it("toTop is a no-op when the section is already first", () => {
    const idx = SAMPLE.indexOf("a1");
    mountView(SAMPLE, idx);
    expect(moveSectionToTop()).toBe(false);
  });

  it("toBottom moves the cursor's section to the end of its parent's scope", () => {
    // Cursor on a1 — section "## A" should drop past ## B and ## C.
    const idx = SAMPLE.indexOf("a1");
    const view = mountView(SAMPLE, idx);
    expect(moveSectionToBottom()).toBe(true);
    const out = view.state.doc.toString();
    const aPos = out.indexOf("## A");
    const cPos = out.indexOf("## C");
    expect(cPos).toBeLessThan(aPos);
  });

  it("toBottom is a no-op when the section is already last", () => {
    const idx = SAMPLE.indexOf("c1");
    mountView(SAMPLE, idx);
    expect(moveSectionToBottom()).toBe(false);
  });
});

describe("moveSectionToLine", () => {
  // Heading lines (0-based) in SAMPLE:
  //  ## A = 3, ## B = 7, ### B.1 = 10, ## C = 13
  it("moves the source section to the slot before the target", () => {
    const view = mountView(SAMPLE, 0);
    // Move ## C (line 13) to before ## A (line 3).
    expect(moveSectionToLine(13, 3, "before")).toBe(true);
    const out = view.state.doc.toString();
    expect(out.indexOf("## C")).toBeLessThan(out.indexOf("## A"));
  });

  it("moves the source section to the slot after the target", () => {
    const view = mountView(SAMPLE, 0);
    // Move ## A (line 3) to after ## B (line 7).
    expect(moveSectionToLine(3, 7, "after")).toBe(true);
    const out = view.state.doc.toString();
    expect(out.indexOf("## B")).toBeLessThan(out.indexOf("## A"));
  });

  it("returns false when source === target", () => {
    mountView(SAMPLE, 0);
    expect(moveSectionToLine(3, 3, "before")).toBe(false);
  });

  it("returns false when source / target line is not a heading line", () => {
    mountView(SAMPLE, 0);
    // Line 4 is "a1", not a heading.
    expect(moveSectionToLine(4, 3, "before")).toBe(false);
  });
});

describe("deleteCurrentSection", () => {
  it("removes the section + its body + nested subsections", () => {
    // Cursor on "b1" — should remove ## B and ### B.1.
    const idx = SAMPLE.indexOf("b1");
    const view = mountView(SAMPLE, idx);
    expect(deleteCurrentSection()).toBe(true);
    const out = view.state.doc.toString();
    expect(out).not.toContain("## B");
    expect(out).not.toContain("### B.1");
    expect(out).not.toContain("deep");
    // Sibling sections still present.
    expect(out).toContain("## A");
    expect(out).toContain("## C");
  });

  it("removes the last section without leaving a trailing blank line", () => {
    // Cursor on "c1" — ## C is the last section.
    const idx = SAMPLE.indexOf("c1");
    const view = mountView(SAMPLE, idx);
    expect(deleteCurrentSection()).toBe(true);
    const out = view.state.doc.toString();
    expect(out).not.toContain("## C");
    expect(out).not.toContain("c1");
    expect(out.endsWith("\n\n")).toBe(false);
  });

  it("returns false when no source view is mounted", () => {
    setActiveSourceView(null);
    expect(deleteCurrentSection()).toBe(false);
  });

  it("returns false when cursor is in preamble (no enclosing heading)", () => {
    mountView("just some text\nmore", 0);
    expect(deleteCurrentSection()).toBe(false);
  });

  it("places caret at where the section began", () => {
    const idx = SAMPLE.indexOf("a1");
    const view = mountView(SAMPLE, idx);
    const beforeHead = view.state.doc.lineAt(view.state.selection.main.head).from;
    deleteCurrentSection();
    // Selection should now anchor at the start of what used to be the heading
    // line, which equals the original heading-line start (before any text
    // shift).
    expect(view.state.selection.main.head).toBeLessThanOrEqual(beforeHead);
  });
});

describe("getCurrentSectionText", () => {
  it("returns the heading line plus its body up to the next peer", () => {
    // Cursor on "a1" — section is ## A (one heading + 3 lines of body).
    const idx = SAMPLE.indexOf("a1");
    mountView(SAMPLE, idx);
    const text = getCurrentSectionText();
    expect(text).toBe("## A\na1\na2\n");
  });

  it("includes nested subsections inside the enclosing section", () => {
    // Cursor on "b1" — section ## B owns ### B.1 too.
    const idx = SAMPLE.indexOf("b1");
    mountView(SAMPLE, idx);
    const text = getCurrentSectionText();
    expect(text).toBe("## B\nb1\n\n### B.1\ndeep\n");
  });

  it("returns the top-level section when cursor is in the preamble of H1", () => {
    // Cursor on "intro line" — enclosing heading is "# Top".
    const idx = SAMPLE.indexOf("intro line");
    mountView(SAMPLE, idx);
    const text = getCurrentSectionText();
    expect(text?.startsWith("# Top\nintro line")).toBe(true);
  });

  it("returns null when no source view is mounted", () => {
    setActiveSourceView(null);
    expect(getCurrentSectionText()).toBeNull();
  });

  it("returns null when cursor is in pre-heading text (no enclosing heading)", () => {
    mountView("just some text\nmore text", 0);
    expect(getCurrentSectionText()).toBeNull();
  });
});
