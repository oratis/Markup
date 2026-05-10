import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { setActiveSourceView } from "./active-source-view";
import { duplicateLine, moveLineDown, moveLineUp, toggleBlockquote } from "./cm-line-ops";

function mountView(doc: string, anchor = 0, head?: number): EditorView {
  const view = new EditorView({
    state: EditorState.create({
      doc,
      selection: { anchor, head: head ?? anchor },
    }),
  });
  setActiveSourceView(view);
  return view;
}

afterEach(() => setActiveSourceView(null));

describe("moveLineUp / moveLineDown", () => {
  it("swaps the current line with the line above", () => {
    const view = mountView("alpha\nbeta\ngamma", 6); // cursor on "beta"
    expect(moveLineUp()).toBe(true);
    expect(view.state.doc.toString()).toBe("beta\nalpha\ngamma");
  });

  it("is a no-op on the first line", () => {
    const view = mountView("alpha\nbeta", 0);
    expect(moveLineUp()).toBe(false);
    expect(view.state.doc.toString()).toBe("alpha\nbeta");
  });

  it("swaps the current line with the line below", () => {
    const view = mountView("alpha\nbeta\ngamma", 6); // cursor on "beta"
    expect(moveLineDown()).toBe(true);
    expect(view.state.doc.toString()).toBe("alpha\ngamma\nbeta");
  });

  it("is a no-op on the last line", () => {
    mountView("alpha\nbeta", 6);
    expect(moveLineDown()).toBe(false);
  });

  it("returns false when no source view is active", () => {
    setActiveSourceView(null);
    expect(moveLineUp()).toBe(false);
    expect(moveLineDown()).toBe(false);
  });
});

describe("duplicateLine", () => {
  it("inserts a copy of the current line right below it", () => {
    const view = mountView("alpha\nbeta\ngamma", 6); // cursor on "beta"
    expect(duplicateLine()).toBe(true);
    expect(view.state.doc.toString()).toBe("alpha\nbeta\nbeta\ngamma");
  });
});

describe("toggleBlockquote", () => {
  it("adds `> ` to the current line when not yet quoted", () => {
    const view = mountView("hello", 0);
    expect(toggleBlockquote()).toBe(true);
    expect(view.state.doc.toString()).toBe("> hello");
  });

  it("strips `> ` when every selected line is already quoted", () => {
    const view = mountView("> a\n> b\n> c", 0, 11);
    expect(toggleBlockquote()).toBe(true);
    expect(view.state.doc.toString()).toBe("a\nb\nc");
  });

  it("quotes mixed selections by adding `> ` to each line", () => {
    const view = mountView("> a\nb\n> c", 0, 9);
    expect(toggleBlockquote()).toBe(true);
    expect(view.state.doc.toString()).toBe("> > a\n> b\n> > c");
  });
});
