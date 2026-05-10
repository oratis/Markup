import { describe, expect, it } from "vitest";
import { replaceAll } from "./text-replace";

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
});
