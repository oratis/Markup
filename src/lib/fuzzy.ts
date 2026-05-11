/** Greedy in-order subsequence match. Returns a score, or
 * `Number.NEGATIVE_INFINITY` if `needle` is not a subsequence of
 * `haystack`. Both inputs should already be normalised to the same case
 * — the function does not lowercase for you.
 *
 * Scoring:
 *  - +1 per matched character
 *  - +3 bonus for a character that's adjacent to the previous match
 *    (consecutive-run reward)
 *  - +2 bonus when matching at start of string or right after a path
 *    separator / underscore / hyphen / dot / space (word-boundary)
 *  - -0.01 × haystack.length so shorter paths beat longer paths on ties
 *
 * Use case: ranking vault files in QuickOpen. Pulled out of the
 * component so it has tests and is reusable. */
export function scoreSubsequence(haystack: string, needle: string): number {
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
