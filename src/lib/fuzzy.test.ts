import { describe, expect, it } from "vitest";
import { scoreSubsequence } from "./fuzzy";

describe("scoreSubsequence", () => {
  it("returns -Infinity when needle is not a subsequence", () => {
    expect(scoreSubsequence("hello", "xyz")).toBe(Number.NEGATIVE_INFINITY);
    expect(scoreSubsequence("abc", "abcd")).toBe(Number.NEGATIVE_INFINITY);
  });

  it("scores consecutive matches higher than scattered", () => {
    const consecutive = scoreSubsequence("foobar.md", "foo");
    const scattered = scoreSubsequence("f_o_o_b_a_r.md", "foo");
    expect(consecutive).toBeGreaterThan(scattered);
  });

  it("rewards matches after a separator", () => {
    const sepBoundary = scoreSubsequence("notes/api.md", "api");
    const midword = scoreSubsequence("xxxnotesapixxx.md", "api");
    expect(sepBoundary).toBeGreaterThan(midword);
  });

  it("treats _ . - and space as boundaries", () => {
    expect(scoreSubsequence("a_b", "b")).toBeGreaterThan(scoreSubsequence("ab", "b"));
    expect(scoreSubsequence("a-b", "b")).toBeGreaterThan(scoreSubsequence("ab", "b"));
    expect(scoreSubsequence("a.b", "b")).toBeGreaterThan(scoreSubsequence("ab", "b"));
    expect(scoreSubsequence("a b", "b")).toBeGreaterThan(scoreSubsequence("ab", "b"));
  });

  it("uses index 0 as a boundary (start of string bonus)", () => {
    const atStart = scoreSubsequence("foo.md", "f");
    const inMid = scoreSubsequence("xfoo.md", "f");
    expect(atStart).toBeGreaterThan(inMid);
  });

  it("prefers shorter haystacks on otherwise-equal matches", () => {
    const short = scoreSubsequence("api.md", "api");
    const long = scoreSubsequence("api.long_name_here.md", "api");
    expect(short).toBeGreaterThan(long);
  });

  it("scores an empty needle as just the length penalty", () => {
    expect(scoreSubsequence("anything.md", "")).toBeCloseTo(
      -("anything.md".length * 0.01),
    );
  });

  it("respects in-order matching (no reordering)", () => {
    expect(scoreSubsequence("abc", "cba")).toBe(Number.NEGATIVE_INFINITY);
  });
});
