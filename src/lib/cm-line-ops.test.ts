import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { setActiveSourceView } from "./active-source-view";
import {
  cycleHeadingLevel,
  duplicateLine,
  moveLineDown,
  moveLineUp,
  sortLines,
  toggleBlockquote,
  toggleList,
} from "./cm-line-ops";

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

describe("cycleHeadingLevel", () => {
  it("promotes plain text to H1", () => {
    const view = mountView("hello", 0);
    expect(cycleHeadingLevel(1)).toBe(true);
    expect(view.state.doc.toString()).toBe("# hello");
  });

  it("promotes H2 to H3", () => {
    const view = mountView("## title", 0);
    cycleHeadingLevel(1);
    expect(view.state.doc.toString()).toBe("### title");
  });

  it("clamps at H6", () => {
    const view = mountView("###### deep", 0);
    cycleHeadingLevel(1);
    expect(view.state.doc.toString()).toBe("###### deep");
  });

  it("demoting H1 strips the heading marker entirely", () => {
    const view = mountView("# top", 0);
    cycleHeadingLevel(-1);
    expect(view.state.doc.toString()).toBe("top");
  });

  it("converts a bullet line into a heading when promoting", () => {
    const view = mountView("- item", 0);
    cycleHeadingLevel(1);
    expect(view.state.doc.toString()).toBe("# item");
  });
});

describe("toggleList", () => {
  it("turns plain lines into a bullet list", () => {
    const view = mountView("a\nb", 0, 3);
    toggleList("bullet");
    expect(view.state.doc.toString()).toBe("- a\n- b");
  });

  it("strips the marker when every line is already that list type", () => {
    const view = mountView("- a\n- b", 0, 7);
    toggleList("bullet");
    expect(view.state.doc.toString()).toBe("a\nb");
  });

  it("converts a bullet list into a numbered list", () => {
    const view = mountView("- a\n- b\n- c", 0, 11);
    toggleList("ordered");
    expect(view.state.doc.toString()).toBe("1. a\n2. b\n3. c");
  });

  it("turns plain lines into a task list", () => {
    const view = mountView("buy milk\nfeed cat", 0, 17);
    toggleList("task");
    expect(view.state.doc.toString()).toBe("- [ ] buy milk\n- [ ] feed cat");
  });

  it("strips a task list when every line is already a task", () => {
    const view = mountView("- [x] done\n- [ ] todo", 0, 21);
    toggleList("task");
    expect(view.state.doc.toString()).toBe("done\ntodo");
  });
});

describe("sortLines", () => {
  it("sorts the selected lines ascending case-insensitively", () => {
    const view = mountView("Banana\napple\ncherry", 0, 19);
    sortLines("asc");
    expect(view.state.doc.toString()).toBe("apple\nBanana\ncherry");
  });

  it("descending reverses the asc result", () => {
    const view = mountView("apple\nBanana\ncherry", 0, 19);
    sortLines("desc");
    expect(view.state.doc.toString()).toBe("cherry\nBanana\napple");
  });

  it("is a no-op when only one line is in the selection", () => {
    const view = mountView("only", 0);
    expect(sortLines("asc")).toBe(false);
    expect(view.state.doc.toString()).toBe("only");
  });
});
