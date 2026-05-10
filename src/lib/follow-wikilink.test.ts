import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { setActiveSourceView } from "./active-source-view";
import { wikilinkAtCursor } from "./follow-wikilink";

function mount(doc: string, anchor: number): EditorView {
  const view = new EditorView({
    state: EditorState.create({ doc, selection: { anchor } }),
  });
  setActiveSourceView(view);
  return view;
}

afterEach(() => setActiveSourceView(null));

describe("wikilinkAtCursor", () => {
  it("returns the name when the cursor is inside [[…]]", () => {
    // Doc: "see [[Notes]] for details" — cursor inside "Notes".
    mount("see [[Notes]] for details", 8);
    expect(wikilinkAtCursor()).toBe("Notes");
  });

  it("returns null when the cursor is outside any wikilink", () => {
    mount("see [[Notes]] for details", 0);
    expect(wikilinkAtCursor()).toBeNull();
  });

  it("respects the optional position override (for click handlers)", () => {
    mount("see [[Notes]] for details", 0);
    // posOverride 8 falls inside "Notes" even though cursor is at 0.
    expect(wikilinkAtCursor(8)).toBe("Notes");
  });

  it("strips alias text from `[[name|alias]]`", () => {
    mount("see [[Notes|Alias]] for details", 8);
    expect(wikilinkAtCursor()).toBe("Notes");
  });

  it("returns null when no source view is mounted", () => {
    setActiveSourceView(null);
    expect(wikilinkAtCursor()).toBeNull();
  });

  it("handles multiple wikilinks on the same line", () => {
    // "a [[X]] b [[Y]] c" — cursor inside [[Y]].
    mount("a [[X]] b [[Y]] c", 12);
    expect(wikilinkAtCursor()).toBe("Y");
  });
});
