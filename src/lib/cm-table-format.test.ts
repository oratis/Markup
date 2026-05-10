import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { setActiveSourceView } from "./active-source-view";
import { formatTable, toggleTaskCheckboxOnLine } from "./cm-table-format";

function mountView(doc: string, anchor: number, head?: number): EditorView {
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

describe("formatTable", () => {
  it("aligns column widths and rebuilds the separator", () => {
    const md = ["| a | b |", "|-|-|", "| longer cell | x |"].join("\n");
    const view = mountView(md, 0);
    expect(formatTable()).toBe(true);
    expect(view.state.doc.toString()).toBe(
      ["| a           | b   |", "| ----------- | --- |", "| longer cell | x   |"].join(
        "\n",
      ),
    );
  });

  it("preserves explicit alignment markers (left / center / right)", () => {
    const md = ["| h1 | h2 | h3 |", "|:---|:---:|---:|", "| a | b | c |"].join("\n");
    const view = mountView(md, 0);
    formatTable();
    const out = view.state.doc.toString().split("\n");
    expect(out[1]).toMatch(/^\| :-+ \| :-+: \| -+: \|$/);
  });

  it("returns false when the cursor is not on a table line", () => {
    mountView("just a paragraph\nnothing here", 0);
    expect(formatTable()).toBe(false);
  });
});

describe("toggleTaskCheckboxOnLine", () => {
  it("flips an unchecked task to checked", () => {
    const view = mountView("- [ ] buy milk", 0);
    expect(toggleTaskCheckboxOnLine()).toBe(true);
    expect(view.state.doc.toString()).toBe("- [x] buy milk");
  });

  it("flips a checked task back to unchecked", () => {
    const view = mountView("- [x] done", 0);
    toggleTaskCheckboxOnLine();
    expect(view.state.doc.toString()).toBe("- [ ] done");
  });

  it("returns false on a regular bullet line (no checkbox)", () => {
    const view = mountView("- plain bullet", 0);
    expect(toggleTaskCheckboxOnLine()).toBe(false);
    expect(view.state.doc.toString()).toBe("- plain bullet");
  });
});
