import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";
import { autoClosePairs } from "./cm-auto-close";

function makeView(doc: string, anchor: number, head?: number): EditorView {
  const view = new EditorView({
    state: EditorState.create({
      doc,
      selection: { anchor, head: head ?? anchor },
      extensions: [autoClosePairs()],
    }),
  });
  return view;
}

// Drive the input handler the same way CodeMirror does internally —
// `EditorView.inputHandler.of(...)` exposes its facet via state. We
// dispatch a "transaction" via the inputHandler by simulating beforeinput.
// Easier: read the handler directly off the facet and invoke it.
function pressKey(view: EditorView, text: string): boolean {
  // biome-ignore lint/suspicious/noExplicitAny: testing a private surface
  const handlers = (view.state as any).facet(EditorView.inputHandler) as Array<
    (view: EditorView, from: number, to: number, text: string) => boolean
  >;
  const { from, to } = view.state.selection.main;
  for (const h of handlers) {
    if (h(view, from, to, text)) return true;
  }
  return false;
}

describe("autoClosePairs", () => {
  it("inserts a paired closer at the cursor when the next char isn't word-y", () => {
    // Doc is "hello " (length 6) with cursor after the space.
    const view = makeView("hello ", 6);
    expect(pressKey(view, "(")).toBe(true);
    expect(view.state.doc.toString()).toBe("hello ()");
    // Cursor parked between the inserted pair so the next keystroke types
    // inside the parens.
    expect(view.state.selection.main.anchor).toBe(7);
  });

  it("does NOT auto-close when the next character is a word char", () => {
    const view = makeView("foo", 0);
    expect(pressKey(view, "(")).toBe(false);
  });

  it("wraps a non-empty selection in the chosen pair", () => {
    const view = makeView("hello world", 6, 11); // selects "world"
    expect(pressKey(view, "[")).toBe(true);
    expect(view.state.doc.toString()).toBe("hello [world]");
    const sel = view.state.selection.main;
    expect(sel.anchor).toBe(7);
    expect(sel.head).toBe(12);
  });

  it("falls through for unrelated characters", () => {
    const view = makeView("", 0);
    expect(pressKey(view, "x")).toBe(false);
  });
});
