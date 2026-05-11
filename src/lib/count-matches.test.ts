import { describe, expect, it } from "vitest";
import { countMatches } from "./count-matches";

describe("countMatches — plain substring", () => {
  it("returns 0 for empty query", () => {
    expect(countMatches("anything", "", false, false)).toBe(0);
  });

  it("counts case-insensitive matches by default", () => {
    expect(countMatches("Hello hello HELLO", "hello", false, false)).toBe(3);
  });

  it("respects case-sensitive mode", () => {
    expect(countMatches("Hello hello HELLO", "hello", true, false)).toBe(1);
  });

  it("counts overlapping needles correctly (non-overlapping consumption)", () => {
    // "aaaa" with needle "aa": after first match at 0 we resume at 2,
    // so the count is 2 — overlapping isn't counted.
    expect(countMatches("aaaa", "aa", true, false)).toBe(2);
  });

  it("returns 0 when needle is absent", () => {
    expect(countMatches("hello world", "xyz", false, false)).toBe(0);
  });
});

describe("countMatches — regex", () => {
  it("returns 0 for an invalid pattern", () => {
    expect(countMatches("abc", "(unbalanced", false, true)).toBe(0);
  });

  it("counts matches with global flag", () => {
    expect(countMatches("a1 b2 c3", "[0-9]", false, true)).toBe(3);
  });

  it("respects case sensitivity in regex mode", () => {
    expect(countMatches("Foo foo FOO", "foo", true, true)).toBe(1);
    expect(countMatches("Foo foo FOO", "foo", false, true)).toBe(3);
  });

  it("does not infinite-loop on zero-length matches", () => {
    // /x*/g is the canonical zero-length-friendly pattern; previously
    // this would loop forever after matching empty at position 1.
    const n = countMatches("xabc", "x*", true, true);
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(9999);
  });

  it("caps results at the bound (9999)", () => {
    const huge = "a".repeat(20_000);
    expect(countMatches(huge, "a", true, true)).toBe(9999);
  });
});
