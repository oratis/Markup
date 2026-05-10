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
  const handler = continueListKeymap.find((b) => b.key === "Enter")?.run;
  return handler ? handler(view) : false;
}

function pressTab(view: EditorView): boolean {
  const handler = continueListKeymap.find((b) => b.key === "Tab")?.run;
  return handler ? handler(view) : false;
}

function pressShiftTab(view: EditorView): boolean {
  const handler = continueListKeymap.find((b) => b.key === "Shift-Tab")?.run;
  return handler ? handler(view) : false;
}

function pressBackspace(view: EditorView): boolean {
  const handler = continueListKeymap.find((b) => b.key === "Backspace")?.run;
  return handler ? handler(view) : false;
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

  it("Tab indents a list line by 2 spaces", () => {
    const view = mount("- item", 6);
    expect(pressTab(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("  - item");
  });

  it("Shift-Tab outdents an indented list line", () => {
    const view = mount("  - item", 8);
    expect(pressShiftTab(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("- item");
  });

  it("Tab is a no-op on non-list lines (lets default tab run)", () => {
    const view = mount("plain", 5);
    expect(pressTab(view)).toBe(false);
  });

  it("Shift-Tab on an unindented list line is a no-op", () => {
    const view = mount("- item", 6);
    expect(pressShiftTab(view)).toBe(false);
  });

  it("Backspace at start of indented list outdents", () => {
    // cursor positioned just before the "-" (after the 2-space indent)
    const view = mount("  - item", 2);
    expect(pressBackspace(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("- item");
  });

  it("Backspace mid-line on a list line falls through (default delete)", () => {
    const view = mount("  - item", 5);
    expect(pressBackspace(view)).toBe(false);
  });

  it("Backspace on a non-list line falls through", () => {
    const view = mount("  para", 2);
    expect(pressBackspace(view)).toBe(false);
  });
});
