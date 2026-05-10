import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { describe, expect, it } from "vitest";
import { continueListKeymap } from "./cm-list-continue";

function mount(doc: string, anchor: number): EditorView {
  return new EditorView({
    state: EditorState.create({
      doc,
      selection: { anchor },
      extensions: [keymap.of(continueListKeymap)],
    }),
  });
}

function pressEnter(view: EditorView): boolean {
  // The keymap returns true if it handled it. Invoke the handler directly
  // since jsdom can't synthesise CM6 key events fully.
  const handler = continueListKeymap[0].run!;
  return handler(view);
}

describe("continueListKeymap", () => {
  it("inserts the next bullet on Enter at end of bullet line", () => {
    const view = mount("- item", 6);
    expect(pressEnter(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("- item\n- ");
  });

  it("preserves leading indentation", () => {
    const view = mount("  - nested", 10);
    pressEnter(view);
    expect(view.state.doc.toString()).toBe("  - nested\n  - ");
  });

  it("increments numbered list markers", () => {
    const view = mount("1. first", 8);
    pressEnter(view);
    expect(view.state.doc.toString()).toBe("1. first\n2. ");
  });

  it("preserves numbered separator style (1) vs 1.)", () => {
    const view = mount("3) item", 7);
    pressEnter(view);
    expect(view.state.doc.toString()).toBe("3) item\n4) ");
  });

  it("inserts task list checkbox", () => {
    const view = mount("- [ ] buy milk", 14);
    pressEnter(view);
    expect(view.state.doc.toString()).toBe("- [ ] buy milk\n- [ ] ");
  });

  it("empty list line: strips the marker (exit list)", () => {
    const view = mount("- ", 2);
    pressEnter(view);
    expect(view.state.doc.toString()).toBe("");
  });

  it("returns false outside list lines (lets default Enter run)", () => {
    const view = mount("plain paragraph", 15);
    expect(pressEnter(view)).toBe(false);
  });

  it("returns false when cursor is mid-line (not at end)", () => {
    const view = mount("- item", 3);
    expect(pressEnter(view)).toBe(false);
  });
});
