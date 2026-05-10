import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { setActiveSourceView } from "./active-source-view";
import { moveSectionDown, moveSectionUp } from "./cm-section";

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
