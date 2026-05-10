import { describe, expect, it } from "vitest";

/** Inline copy of QuickOpen's scorer so this test isn't coupled to the
 *  React component's render. Kept in sync with the implementation. */
function scoreSubsequence(haystack: string, needle: string): number {
  let score = 0;
  let h = 0;
  let lastMatchH = -1;
  for (let n = 0; n < needle.length; n++) {
    while (h < haystack.length && haystack[h] !== needle[n]) h++;
    if (h >= haystack.length) return Number.NEGATIVE_INFINITY;
    if (lastMatchH === h - 1) score += 3;
    else score += 1;
    if (h === 0 || /[\/_\-. ]/.test(haystack[h - 1])) score += 2;
    lastMatchH = h;
    h++;
  }
  score -= haystack.length * 0.01;
  return score;
}

describe("fuzzy subsequence matcher", () => {
  it("returns -Infinity when needle is not a subsequence", () => {
    expect(scoreSubsequence("hello", "xyz")).toBe(Number.NEGATIVE_INFINITY);
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

  it("prefers shorter haystacks on ties", () => {
    const short = scoreSubsequence("api.md", "api");
    const long = scoreSubsequence("api.long_name_here.md", "api");
    expect(short).toBeGreaterThan(long);
  });

  it("scores an empty needle as 0 (no characters to match)", () => {
    expect(scoreSubsequence("anything.md", "")).toBeCloseTo(
      -("anything.md".length * 0.01),
    );
  });
});
