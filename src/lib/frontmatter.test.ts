import { describe, expect, it } from "vitest";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter";

describe("parseFrontmatter — no frontmatter", () => {
  it("returns empty properties and body=content", () => {
    const r = parseFrontmatter("just body");
    expect(r.properties).toEqual({});
    expect(r.body).toBe("just body");
    expect(r.hadFrontmatter).toBe(false);
  });

  it("rejects a leading --- without a closer", () => {
    const r = parseFrontmatter("---\nkey: value\n\nbody");
    expect(r.hadFrontmatter).toBe(false);
    expect(r.body).toBe("---\nkey: value\n\nbody");
  });

  it("does not treat a mid-doc --- as frontmatter", () => {
    const r = parseFrontmatter("body\n\n---\nfake: yaml\n---\n");
    expect(r.hadFrontmatter).toBe(false);
  });
});

describe("parseFrontmatter — scalars", () => {
  it("parses a bare string", () => {
    const r = parseFrontmatter("---\ntitle: Hello\n---\nbody");
    expect(r.properties.title).toBe("Hello");
  });

  it("parses quoted strings preserving inner content", () => {
    const r = parseFrontmatter(`---\nq: "a: b"\ns: 'c, d'\n---\n`);
    expect(r.properties.q).toBe("a: b");
    expect(r.properties.s).toBe("c, d");
  });

  it("parses integers and floats", () => {
    const r = parseFrontmatter("---\nn: 42\nf: 3.14\n---\n");
    expect(r.properties.n).toBe(42);
    expect(r.properties.f).toBeCloseTo(3.14);
  });

  it("parses booleans (true/false/yes/no)", () => {
    const r = parseFrontmatter("---\na: true\nb: false\nc: yes\nd: no\n---\n");
    expect(r.properties).toEqual({ a: true, b: false, c: true, d: false });
  });

  it("parses null forms", () => {
    const r = parseFrontmatter("---\na:\nb: ~\nc: null\n---\n");
    expect(r.properties).toEqual({ a: null, b: null, c: null });
  });
});

describe("parseFrontmatter — arrays", () => {
  it("parses inline arrays", () => {
    const r = parseFrontmatter("---\ntags: [a, b, c]\n---\n");
    expect(r.properties.tags).toEqual(["a", "b", "c"]);
  });

  it("parses quoted strings inside inline arrays", () => {
    const r = parseFrontmatter(`---\ntags: ["one two", three]\n---\n`);
    expect(r.properties.tags).toEqual(["one two", "three"]);
  });

  it("parses block arrays", () => {
    const r = parseFrontmatter("---\ntags:\n  - alpha\n  - beta\n---\n");
    expect(r.properties.tags).toEqual(["alpha", "beta"]);
  });

  it("handles an empty inline array []", () => {
    const r = parseFrontmatter("---\ntags: []\n---\n");
    expect(r.properties.tags).toEqual([]);
  });
});

describe("parseFrontmatter — body separation", () => {
  it("keeps body content intact", () => {
    const r = parseFrontmatter("---\ntitle: X\n---\n\nLine one\nLine two\n");
    expect(r.body).toBe("\nLine one\nLine two\n");
  });

  it("ignores comments and blank lines inside FM block", () => {
    const r = parseFrontmatter("---\n# comment\n\ntitle: T\n---\nbody");
    expect(r.properties).toEqual({ title: "T" });
  });
});

describe("serializeFrontmatter", () => {
  it("round-trips a simple object", () => {
    const props = { title: "Hello", count: 3, draft: true };
    const out = serializeFrontmatter(props, "body");
    expect(out).toContain("title: Hello");
    expect(out).toContain("count: 3");
    expect(out).toContain("draft: true");
    expect(out).toContain("\nbody");
    const re = parseFrontmatter(out);
    expect(re.properties).toEqual(props);
  });

  it("preserves order of insertion", () => {
    const props = { b: 1, a: 2 };
    const out = serializeFrontmatter(props, "");
    const bIdx = out.indexOf("b:");
    const aIdx = out.indexOf("a:");
    expect(bIdx).toBeLessThan(aIdx);
  });

  it("writes block arrays for multi-item lists", () => {
    const out = serializeFrontmatter({ tags: ["a", "b"] }, "body");
    expect(out).toContain("tags:");
    expect(out).toContain("  - a");
    expect(out).toContain("  - b");
  });

  it("writes [] for empty arrays", () => {
    const out = serializeFrontmatter({ tags: [] }, "body");
    expect(out).toContain("tags: []");
  });

  it("quotes ambiguous strings", () => {
    const out = serializeFrontmatter({ a: "true", b: "42", c: "1.5" }, "");
    expect(out).toContain('a: "true"');
    expect(out).toContain('b: "42"');
    expect(out).toContain('c: "1.5"');
  });

  it("quotes strings containing colon-space or # for safety", () => {
    const out = serializeFrontmatter({ s: "key: val", t: "1 #foo" }, "");
    expect(out).toContain('s: "key: val"');
    expect(out).toContain('t: "1 #foo"');
  });

  it("emits FM block when body is empty", () => {
    const out = serializeFrontmatter({ a: 1 }, "");
    // Trailing blank line is fine — Markdown viewers ignore leading blanks.
    expect(out.trimEnd()).toBe("---\na: 1\n---");
  });

  it("round-trips through parse with arrays", () => {
    const orig = { title: "X", tags: ["a", "b"], count: 2, draft: false };
    const out = serializeFrontmatter(orig, "body");
    const re = parseFrontmatter(out);
    expect(re.properties).toEqual(orig);
    expect(re.body.trimStart()).toBe("body");
  });

  it("returns just body when properties is empty", () => {
    expect(serializeFrontmatter({}, "body")).toBe("body");
  });
});

describe("frontmatter — multi-line / escaped scalar round-trip (regression)", () => {
  it("round-trips a value containing a newline (was truncated)", () => {
    const out = serializeFrontmatter({ note: "line1\nline2" }, "body");
    expect(parseFrontmatter(out).properties.note).toBe("line1\nline2");
  });

  it("round-trips tabs and embedded quotes", () => {
    const out = serializeFrontmatter({ s: 'a\tb "c"' }, "body");
    expect(parseFrontmatter(out).properties.s).toBe('a\tb "c"');
  });

  it("inline array: an element ending in an escaped backslash still closes", () => {
    // tags: ["a\\", b] — first element is the string `a\`. The old close-quote
    // test misread `\\"` as an escaped quote and merged the rest of the array
    // into one malformed element.
    const doc = parseFrontmatter('---\ntags: ["a\\\\", b]\n---\n');
    expect(doc.properties.tags).toEqual(["a\\", "b"]);
  });
});
