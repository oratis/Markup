import { describe, expect, it } from "vitest";
import {
  findBlock,
  findSectionByHeading,
  sliceEmbed,
  splitEmbedTarget,
} from "./embed-slice";

describe("splitEmbedTarget", () => {
  it("handles a bare file target", () => {
    expect(splitEmbedTarget("Foo")).toEqual({
      file: "Foo",
      heading: null,
      blockId: null,
    });
  });

  it("splits #heading", () => {
    expect(splitEmbedTarget("Foo#Section")).toEqual({
      file: "Foo",
      heading: "Section",
      blockId: null,
    });
  });

  it("splits ^block", () => {
    expect(splitEmbedTarget("Foo^abc")).toEqual({
      file: "Foo",
      heading: null,
      blockId: "abc",
    });
  });

  it("ignores trailing ^ after a heading anchor", () => {
    // Inputs like Foo#Section^block aren't valid Obsidian syntax — treat
    // the first anchor as authoritative.
    expect(splitEmbedTarget("Foo#Section^extra").heading).toBe("Section");
  });

  it("trims whitespace inside the file part", () => {
    expect(splitEmbedTarget(" Foo #Sec ").file).toBe("Foo");
  });
});

const DOC = [
  "# Top",
  "intro line",
  "",
  "## Setup",
  "setup body",
  "",
  "### Deep",
  "deeper text",
  "",
  "## Usage",
  "use line one",
  "use line two ^use1",
  "",
  "## Done",
  "done body",
].join("\n");

describe("findSectionByHeading", () => {
  it("returns the H1 section spanning to EOF when nothing else above", () => {
    expect(findSectionByHeading("# Solo\nbody", "Solo")).toBe("# Solo\nbody");
  });

  it("returns the H2 section through to the next same-level heading", () => {
    const out = findSectionByHeading(DOC, "Setup");
    expect(out).toContain("## Setup");
    expect(out).toContain("setup body");
    expect(out).toContain("### Deep");
    expect(out).toContain("deeper text");
    expect(out).not.toContain("## Usage");
  });

  it("doesn't bleed past a shallower heading", () => {
    const out = findSectionByHeading(DOC, "Deep");
    expect(out).toContain("### Deep");
    expect(out).toContain("deeper text");
    expect(out).not.toContain("## Usage");
  });

  it("returns null when the heading isn't found", () => {
    expect(findSectionByHeading(DOC, "Nope")).toBeNull();
  });

  it("ignores headings inside fenced code blocks", () => {
    const md = "# Top\n```\n## Fake\nshould not be found\n```\n## Real\nrealbody";
    expect(findSectionByHeading(md, "Fake")).toBeNull();
    expect(findSectionByHeading(md, "Real")).toContain("realbody");
  });
});

describe("findBlock", () => {
  it("returns the paragraph carrying the ^id marker, marker stripped", () => {
    const out = findBlock(DOC, "use1");
    expect(out).toBe("use line one\nuse line two");
  });

  it("returns null when the id isn't present", () => {
    expect(findBlock(DOC, "missing")).toBeNull();
  });

  it("works for a single-line block", () => {
    const md = "first paragraph\n\nsecond. ^b1\n\nthird";
    expect(findBlock(md, "b1")).toBe("second.");
  });

  it("requires whitespace before the ^ (no in-word matches)", () => {
    const md = "thisisbad^foo\n";
    expect(findBlock(md, "foo")).toBeNull();
  });

  it("rejects when the marker is in mid-line", () => {
    const md = "before ^abc after\nnext";
    expect(findBlock(md, "abc")).toBeNull();
  });

  it("does not throw on a block id with regex metacharacters", () => {
    // blockId comes verbatim from the wikilink target (e.g. `[[Note^a(b]]`),
    // so it can contain regex specials. An unescaped RegExp would throw
    // SyntaxError here and crash the render-time callers.
    const md = "some paragraph ^a(b\n";
    expect(() => findBlock(md, "a(b")).not.toThrow();
    expect(findBlock(md, "a(b")).toBe("some paragraph");
  });

  it("strips a marker containing a dot without over-matching", () => {
    const md = "alpha ^v1.2\n";
    expect(findBlock(md, "v1.2")).toBe("alpha");
  });
});

describe("sliceEmbed", () => {
  it("returns full content when no anchor", () => {
    expect(sliceEmbed("body", null, null)).toBe("body");
  });

  it("delegates to findSectionByHeading", () => {
    expect(sliceEmbed(DOC, "Setup", null)).toContain("setup body");
  });

  it("delegates to findBlock", () => {
    expect(sliceEmbed(DOC, null, "use1")).toBe("use line one\nuse line two");
  });

  it("returns null when the anchor isn't found", () => {
    expect(sliceEmbed(DOC, "Missing", null)).toBeNull();
    expect(sliceEmbed(DOC, null, "missing")).toBeNull();
  });
});
