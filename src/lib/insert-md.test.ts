import { afterEach, describe, expect, it } from "vitest";
import { setActiveSourceView } from "./active-source-view";
import {
  buildTableMarkdown,
  insertMarkdown,
  toTitleCase,
  transformSelection,
  wrapMarkdown,
} from "./insert-md";

afterEach(() => setActiveSourceView(null));

describe("buildTableMarkdown", () => {
  it("builds a header + separator + body for the requested size", () => {
    const md = buildTableMarkdown(2, 3);
    expect(md).toContain("Col 1");
    expect(md).toContain("Col 3");
    // header + separator + 2 body rows + trailing newline
    expect(md.trim().split("\n")).toHaveLength(4);
    // separator row uses --- per column
    expect(md).toContain("|---|---|---|");
  });

  it("clamps absurd inputs", () => {
    const huge = buildTableMarkdown(1000, 1000);
    // sep line has at most 20 columns → bounded
    const sepLine = huge.split("\n")[1];
    expect(sepLine.split("|").filter(Boolean)).toHaveLength(20);
  });

  it("normalises non-integer & negative inputs to at least 1×1", () => {
    const md = buildTableMarkdown(0, -3);
    // 1 col header
    expect(md).toContain("Col 1");
    expect(md).not.toContain("Col 2");
  });
});

describe("wrapMarkdown (WYSIWYG path)", () => {
  it("wraps a non-empty selection with the open / close markers", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    host.contentEditable = "true";
    host.textContent = "the quick fox";
    const range = document.createRange();
    range.setStart(host.firstChild!, 4);
    range.setEnd(host.firstChild!, 9); // "quick"
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    expect(wrapMarkdown("**", "**")).toBe(true);
    expect(host.textContent).toBe("the **quick** fox");
    document.body.removeChild(host);
  });

  it("inserts the marker pair at the caret when the selection is empty", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    host.contentEditable = "true";
    host.textContent = "abc";
    const range = document.createRange();
    range.setStart(host.firstChild!, 3);
    range.setEnd(host.firstChild!, 3);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    expect(wrapMarkdown("`", "`")).toBe(true);
    expect(host.textContent).toBe("abc``");
    document.body.removeChild(host);
  });
});

describe("toTitleCase", () => {
  it("capitalises the first letter of each word", () => {
    expect(toTitleCase("hello world")).toBe("Hello World");
  });

  it("preserves apostrophes inside words", () => {
    expect(toTitleCase("can't stop")).toBe("Can't Stop");
  });

  it("lowercases the rest of an ALL-CAPS word", () => {
    expect(toTitleCase("ENGLISH and 中文")).toBe("English And 中文");
  });
});

describe("transformSelection (WYSIWYG path)", () => {
  it("rewrites the current selection through the supplied function", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    host.contentEditable = "true";
    host.textContent = "the quick fox";
    const range = document.createRange();
    range.setStart(host.firstChild!, 4);
    range.setEnd(host.firstChild!, 9); // "quick"
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    expect(transformSelection((s) => s.toUpperCase())).toBe(true);
    expect(host.textContent).toBe("the QUICK fox");
    document.body.removeChild(host);
  });

  it("returns false when the selection is empty", () => {
    window.getSelection()?.removeAllRanges();
    expect(transformSelection((s) => s.toUpperCase())).toBe(false);
  });
});

describe("insertMarkdown (WYSIWYG path)", () => {
  it("returns false when there is no selection range", () => {
    const sel = window.getSelection();
    sel?.removeAllRanges();
    expect(insertMarkdown("foo")).toBe(false);
  });

  it("inserts text at the current DOM selection's range", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    host.contentEditable = "true";
    host.textContent = "hello";
    const range = document.createRange();
    range.setStart(host.firstChild!, 5);
    range.setEnd(host.firstChild!, 5);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    expect(insertMarkdown(" world")).toBe(true);
    expect(host.textContent).toBe("hello world");
    document.body.removeChild(host);
  });
});
