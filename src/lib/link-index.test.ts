import { describe, expect, it } from "vitest";
import {
  buildBasenameMap,
  buildIndex,
  extractLinks,
  getBacklinks,
  resolveTarget,
  stripAnchor,
  updateFileLinks,
} from "./link-index";

describe("stripAnchor", () => {
  it("removes #heading suffix", () => {
    expect(stripAnchor("Foo#Section")).toBe("Foo");
  });

  it("removes ^block suffix", () => {
    expect(stripAnchor("Foo^abc123")).toBe("Foo");
  });

  it("keeps plain target unchanged", () => {
    expect(stripAnchor("Foo")).toBe("Foo");
  });

  it("strips whichever anchor appears first", () => {
    expect(stripAnchor("Foo#sec^block")).toBe("Foo");
    expect(stripAnchor("Foo^block#sec")).toBe("Foo");
  });
});

describe("extractLinks", () => {
  it("returns empty for empty content", () => {
    expect(extractLinks("", "/a.md")).toEqual([]);
  });

  it("captures a plain wikilink", () => {
    const refs = extractLinks("see [[Foo]] for details", "/a.md");
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({
      sourcePath: "/a.md",
      target: "Foo",
      line: 0,
      isEmbed: false,
    });
  });

  it("captures an embed", () => {
    const refs = extractLinks("![[Foo]]", "/a.md");
    expect(refs[0].isEmbed).toBe(true);
  });

  it("strips display-text part on |", () => {
    const refs = extractLinks("[[Foo|alias label]]", "/a.md");
    expect(refs[0].target).toBe("Foo");
  });

  it("records anchor suffix in target", () => {
    const refs = extractLinks("[[Foo#Heading]]", "/a.md");
    expect(refs[0].target).toBe("Foo#Heading");
  });

  it("ignores wikilinks inside fenced code blocks", () => {
    const md = "before\n```\n[[NotALink]]\n```\nafter [[Real]]";
    const refs = extractLinks(md, "/a.md");
    expect(refs).toHaveLength(1);
    expect(refs[0].target).toBe("Real");
  });

  it("ignores wikilinks inside inline code spans", () => {
    const refs = extractLinks("text `[[NotALink]]` and [[Real]]", "/a.md");
    expect(refs).toHaveLength(1);
    expect(refs[0].target).toBe("Real");
  });

  it("captures multiple links on the same line", () => {
    const refs = extractLinks("see [[A]] and [[B]] too", "/x.md");
    expect(refs).toHaveLength(2);
    expect(refs.map((r) => r.target)).toEqual(["A", "B"]);
  });

  it("records the correct line index", () => {
    const md = "line0\nline1 [[Foo]]\nline2\nline3 [[Bar]]";
    const refs = extractLinks(md, "/a.md");
    expect(refs[0].line).toBe(1);
    expect(refs[1].line).toBe(3);
  });

  it("preserves a snippet of the source line", () => {
    const refs = extractLinks("a longer line with [[Foo]] inside it", "/a.md");
    expect(refs[0].snippet).toBe("a longer line with [[Foo]] inside it");
  });

  it("caps the snippet at 200 chars", () => {
    const long = `${"x".repeat(400)} [[Foo]]`;
    const refs = extractLinks(long, "/a.md");
    expect(refs[0].snippet.length).toBe(200);
  });

  it("skips empty targets like [[ ]]", () => {
    const refs = extractLinks("[[ ]] and [[Real]]", "/a.md");
    expect(refs).toHaveLength(1);
    expect(refs[0].target).toBe("Real");
  });
});

describe("buildBasenameMap", () => {
  it("maps each path to its basename without .md", () => {
    const m = buildBasenameMap(["/v/Foo.md", "/v/sub/Bar.md"]);
    expect(m.get("Foo")).toEqual(["/v/Foo.md"]);
    expect(m.get("Bar")).toEqual(["/v/sub/Bar.md"]);
  });

  it("collects duplicates under the same key", () => {
    const m = buildBasenameMap(["/v/Foo.md", "/v/other/Foo.md"]);
    expect(m.get("Foo")).toEqual(["/v/Foo.md", "/v/other/Foo.md"]);
  });
});

describe("resolveTarget", () => {
  const paths = ["/v/Foo.md", "/v/sub/Bar.md", "/v/sub/Foo.md"];
  const map = buildBasenameMap(paths);

  it("resolves a plain basename to the first match", () => {
    expect(resolveTarget("Bar", map, paths)).toBe("/v/sub/Bar.md");
  });

  it("strips anchors before resolving", () => {
    expect(resolveTarget("Bar#Section", map, paths)).toBe("/v/sub/Bar.md");
    expect(resolveTarget("Bar^block", map, paths)).toBe("/v/sub/Bar.md");
  });

  it("treats [[Foo.md]] same as [[Foo]]", () => {
    expect(resolveTarget("Foo.md", map, paths)).toBe("/v/Foo.md");
  });

  it("resolves path-form 'dir/Foo' to the file under that directory", () => {
    expect(resolveTarget("sub/Bar", map, paths)).toBe("/v/sub/Bar.md");
  });

  it("returns null for unknown targets", () => {
    expect(resolveTarget("DoesNotExist", map, paths)).toBeNull();
  });

  it("returns null for empty target", () => {
    expect(resolveTarget("", map, paths)).toBeNull();
    expect(resolveTarget("   ", map, paths)).toBeNull();
  });

  it("prefers the first registered match when there's a duplicate basename", () => {
    expect(resolveTarget("Foo", map, paths)).toBe("/v/Foo.md");
  });
});

describe("buildIndex + getBacklinks", () => {
  it("builds backlinks for plain wikilinks", () => {
    const idx = buildIndex([
      { path: "/v/A.md", content: "see [[B]]" },
      { path: "/v/B.md", content: "body" },
    ]);
    expect(getBacklinks(idx, "/v/B.md")).toHaveLength(1);
    expect(getBacklinks(idx, "/v/B.md")[0].sourcePath).toBe("/v/A.md");
  });

  it("includes embeds in the backlinks count", () => {
    const idx = buildIndex([
      { path: "/v/A.md", content: "![[B]]" },
      { path: "/v/B.md", content: "body" },
    ]);
    expect(getBacklinks(idx, "/v/B.md")).toHaveLength(1);
    expect(getBacklinks(idx, "/v/B.md")[0].isEmbed).toBe(true);
  });

  it("returns empty array for a file with no backlinks", () => {
    const idx = buildIndex([{ path: "/v/A.md", content: "no links here" }]);
    expect(getBacklinks(idx, "/v/A.md")).toEqual([]);
  });

  it("drops references to non-existent targets", () => {
    const idx = buildIndex([{ path: "/v/A.md", content: "[[Missing]]" }]);
    expect(Object.keys(idx)).toHaveLength(0);
  });

  it("accumulates multiple links from different sources", () => {
    const idx = buildIndex([
      { path: "/v/A.md", content: "[[Z]]" },
      { path: "/v/B.md", content: "see [[Z]] and [[Z]] again" },
      { path: "/v/Z.md", content: "" },
    ]);
    expect(getBacklinks(idx, "/v/Z.md")).toHaveLength(3);
  });

  it("resolves anchored links to the same file", () => {
    const idx = buildIndex([
      { path: "/v/A.md", content: "[[B#Section]] and [[B^block]]" },
      { path: "/v/B.md", content: "" },
    ]);
    expect(getBacklinks(idx, "/v/B.md")).toHaveLength(2);
  });
});

describe("updateFileLinks", () => {
  it("removes the file's old refs and adds new ones", () => {
    const paths = ["/v/A.md", "/v/B.md", "/v/C.md"];
    const map = buildBasenameMap(paths);
    const idx = buildIndex([
      { path: "/v/A.md", content: "[[B]]" },
      { path: "/v/B.md", content: "" },
      { path: "/v/C.md", content: "" },
    ]);
    expect(getBacklinks(idx, "/v/B.md")).toHaveLength(1);

    // Edit A to point at C instead.
    updateFileLinks(idx, "/v/A.md", "[[C]]", map, paths);

    expect(getBacklinks(idx, "/v/B.md")).toHaveLength(0);
    expect(getBacklinks(idx, "/v/C.md")).toHaveLength(1);
  });

  it("is idempotent when the file's content doesn't change", () => {
    const paths = ["/v/A.md", "/v/B.md"];
    const map = buildBasenameMap(paths);
    const idx = buildIndex([
      { path: "/v/A.md", content: "[[B]] and [[B]]" },
      { path: "/v/B.md", content: "" },
    ]);
    const before = getBacklinks(idx, "/v/B.md").length;

    updateFileLinks(idx, "/v/A.md", "[[B]] and [[B]]", map, paths);

    expect(getBacklinks(idx, "/v/B.md").length).toBe(before);
  });

  it("cleans up the bucket entry entirely when no refs remain", () => {
    const paths = ["/v/A.md", "/v/B.md"];
    const map = buildBasenameMap(paths);
    const idx = buildIndex([
      { path: "/v/A.md", content: "[[B]]" },
      { path: "/v/B.md", content: "" },
    ]);
    expect(Object.keys(idx)).toContain("/v/B.md");

    updateFileLinks(idx, "/v/A.md", "no links anymore", map, paths);

    expect(Object.keys(idx)).not.toContain("/v/B.md");
  });
});
