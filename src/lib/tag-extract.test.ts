import { describe, expect, it } from "vitest";
import { extractTags, tagAncestors } from "./tag-extract";

function tags(content: string): string[] {
  return [...extractTags(content)].sort();
}

describe("extractTags — inline #tag", () => {
  it("returns empty for empty input", () => {
    expect(tags("")).toEqual([]);
  });

  it("matches a tag preceded by whitespace", () => {
    expect(tags("see #foo bar")).toEqual(["foo"]);
  });

  it("matches a tag at start of line", () => {
    expect(tags("#foo something")).toEqual(["foo"]);
  });

  it("matches multiple tags on one line", () => {
    expect(tags("#a #b #c")).toEqual(["a", "b", "c"]);
  });

  it("supports nested tags with /", () => {
    expect(tags("see #projects/markup/v2 here")).toEqual(["projects/markup/v2"]);
  });

  it("supports unicode letters in tags", () => {
    expect(tags("中文标签 #笔记 hello")).toEqual(["笔记"]);
  });

  it("does NOT match # inside a word (foo#bar)", () => {
    expect(tags("foo#bar")).toEqual([]);
  });

  it("ignores pure-numeric tags like #42", () => {
    expect(tags("section #42 and #real")).toEqual(["real"]);
  });

  it("strips trailing - or /", () => {
    expect(tags("#foo- end")).toEqual(["foo"]);
    expect(tags("#foo/ end")).toEqual(["foo"]);
  });

  it("preserves case", () => {
    expect(tags("#TODO and #todo")).toEqual(["TODO", "todo"]);
  });

  it("matches a tag after punctuation", () => {
    expect(tags("(#foo) and [#bar]")).toEqual(["bar", "foo"]);
  });
});

describe("extractTags — exclusions", () => {
  it("ignores ATX heading markers", () => {
    expect(tags("# Heading\n## Sub\nbody")).toEqual([]);
  });

  it("still picks up tags on heading lines after the marker", () => {
    expect(tags("## Section #review")).toEqual(["review"]);
  });

  it("ignores tags inside fenced code blocks", () => {
    const md = "before #real\n```\n#include <stdio.h>\n#pragma once\n```\nafter";
    expect(tags(md)).toEqual(["real"]);
  });

  it("ignores tags inside ~~~ fences too", () => {
    const md = "x\n~~~\n#nope\n~~~\n#real";
    expect(tags(md)).toEqual(["real"]);
  });

  it("ignores tags inside inline code spans", () => {
    expect(tags("a `#fake` b #real")).toEqual(["real"]);
  });

  it("does not match across word boundaries on the LEFT", () => {
    // The # has 'o' (word char) before it — not a tag.
    expect(tags("hello#world")).toEqual([]);
  });
});

describe("extractTags — YAML frontmatter", () => {
  it("picks up inline-array tags", () => {
    const md = "---\ntags: [a, b, c]\n---\n\nbody";
    expect(tags(md)).toEqual(["a", "b", "c"]);
  });

  it("picks up block-list tags", () => {
    const md = "---\ntags:\n  - alpha\n  - beta\n---\n\nbody";
    expect(tags(md)).toEqual(["alpha", "beta"]);
  });

  it("merges frontmatter + inline body tags", () => {
    const md = "---\ntags: [yaml]\n---\n\nbody #inline";
    expect(tags(md)).toEqual(["inline", "yaml"]);
  });

  it("strips quotes around YAML scalars", () => {
    const md = `---\ntags: ["with space", 'foo']\n---\n`;
    expect(tags(md)).toEqual(["foo", "with space"]);
  });

  it("strips a leading # from frontmatter scalars (some users write #tag)", () => {
    const md = "---\ntags: [#foo, bar]\n---\n";
    expect(tags(md)).toEqual(["bar", "foo"]);
  });

  it("ignores YAML keys other than tags", () => {
    const md = "---\ntitle: Foo\nauthor: Bar\n---\n\n#real";
    expect(tags(md)).toEqual(["real"]);
  });

  it("requires the document to start with --- (not a stray HR)", () => {
    const md = "intro\n\n---\ntags: [no]\n---\n\nbody";
    expect(tags(md)).toEqual([]);
  });

  it("doesn't choke on an unclosed frontmatter block", () => {
    const md = "---\ntags: [a]\n\nbody #b";
    // Unclosed FM → no FM tags; body tags still work.
    expect(tags(md)).toEqual(["b"]);
  });
});

describe("tagAncestors", () => {
  it("returns the tag itself for a single-segment tag", () => {
    expect(tagAncestors("foo")).toEqual(["foo"]);
  });

  it("returns each segment's prefix chain", () => {
    expect(tagAncestors("projects/markup/v2")).toEqual([
      "projects",
      "projects/markup",
      "projects/markup/v2",
    ]);
  });

  it("skips empty segments from leading / trailing slashes", () => {
    expect(tagAncestors("/foo/bar/")).toEqual(["foo", "foo/bar"]);
  });
});

describe("extractTags — frontmatter edge cases (regression)", () => {
  it("does not truncate the block at a '----' line", () => {
    expect(tags("---\ntitle: A\n----\ntags: [alpha, beta]\n---\nbody")).toEqual([
      "alpha",
      "beta",
    ]);
  });
  it("parses an inline tag array with a trailing YAML comment", () => {
    expect(tags("---\ntags: [alpha, beta] # note\n---\nbody")).toEqual(["alpha", "beta"]);
  });
});
