import { describe, expect, it } from "vitest";
import { replaceAll, replaceOnce } from "./text-replace";

describe("replaceAll", () => {
  it("replaces every occurrence and returns the count", () => {
    const r = replaceAll("foo bar foo baz foo", "foo", "qux");
    expect(r.text).toBe("qux bar qux baz qux");
    expect(r.count).toBe(3);
  });

  it("is case-insensitive", () => {
    const r = replaceAll("Foo FOO foo fOo", "foo", "X");
    expect(r.text).toBe("X X X X");
    expect(r.count).toBe(4);
  });

  it("treats the needle as a literal — regex metachars don't match patterns", () => {
    const r = replaceAll("a.b.c", ".", "-");
    expect(r.text).toBe("a-b-c");
    expect(r.count).toBe(2);
  });

  it("handles empty needle as no-op", () => {
    expect(replaceAll("hello", "", "x")).toEqual({ text: "hello", count: 0 });
  });

  it("returns count 0 for unmatched needle", () => {
    expect(replaceAll("hello", "world", "x").count).toBe(0);
  });

  it("supports special regex chars in the needle", () => {
    const r = replaceAll("a (1) b (2)", "(", "[");
    expect(r.text).toBe("a [1) b [2)");
    expect(r.count).toBe(2);
  });

  it("respects caseSensitive: only matches identical case when true", () => {
    const r = replaceAll("Foo foo FOO", "foo", "X", { caseSensitive: true });
    expect(r.text).toBe("Foo X FOO");
    expect(r.count).toBe(1);
  });
});

describe("replaceOnce", () => {
  it("replaces only the first occurrence and reports its index", () => {
    const r = replaceOnce("foo bar foo baz", "foo", "X");
    expect(r.text).toBe("X bar foo baz");
    expect(r.index).toBe(0);
  });

  it("respects fromIndex when seeking", () => {
    const r = replaceOnce("foo bar foo baz", "foo", "X", { fromIndex: 5 });
    expect(r.text).toBe("foo bar X baz");
    expect(r.index).toBe(8);
  });

  it("returns index -1 when nothing matches", () => {
    const r = replaceOnce("hello", "world", "X");
    expect(r.text).toBe("hello");
    expect(r.index).toBe(-1);
  });

  it("respects caseSensitive flag", () => {
    const r = replaceOnce("Foo foo FOO", "foo", "X", { caseSensitive: true });
    expect(r.text).toBe("Foo X FOO");
    expect(r.index).toBe(4);
  });

  it("case-insensitive splice stays aligned after a length-changing char", () => {
    // "İ" (U+0130) lowercases to two code units. The old approach searched in
    // haystack.toLowerCase() and spliced the original at that (shifted) index,
    // eating characters. Correct result keeps everything but the match.
    expect(replaceOnce("İhello foo world", "foo", "X").text).toBe("İhello X world");
  });
});
