/** A match span as `[start, end)` character offsets into the searched text. */
export type MatchRange = readonly [start: number, end: number];

/** Cap to avoid pathological work on huge docs with very common needles. */
const MATCH_CAP = 9999;

/** All non-overlapping match ranges of `query` in `text` (capped at 9999).
 *  When `regex` is true the query is compiled as a JS pattern (invalid → []);
 *  case sensitivity is opt-in. Single source of truth for the find bar's count,
 *  navigation, and replace so they can never disagree about what matches.
 *
 *  Zero-length regex matches (`^`, `$`, `\b`, lookaheads, `x*`) advance by one
 *  so the scan terminates and each position is counted once (matching
 *  `String.match(/…/g).length`). */
export function findMatchRanges(
  text: string,
  query: string,
  caseSensitive: boolean,
  regex: boolean,
): MatchRange[] {
  if (!query) return [];
  const out: MatchRange[] = [];
  if (regex) {
    let re: RegExp;
    try {
      re = new RegExp(query, caseSensitive ? "g" : "gi");
    } catch {
      return [];
    }
    let m = re.exec(text);
    while (m !== null) {
      out.push([m.index, m.index + m[0].length]);
      if (out.length >= MATCH_CAP) break;
      if (m.index === re.lastIndex) {
        re.lastIndex++;
        if (re.lastIndex > text.length) break;
      }
      m = re.exec(text);
    }
    return out;
  }
  const haystack = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();
  let i = 0;
  for (;;) {
    const idx = haystack.indexOf(needle, i);
    if (idx < 0) break;
    out.push([idx, idx + needle.length]);
    if (out.length >= MATCH_CAP) break;
    i = idx + needle.length; // non-overlapping
  }
  return out;
}

/** Count occurrences of `query` in `text`. Thin wrapper over findMatchRanges. */
export function countMatches(
  text: string,
  query: string,
  caseSensitive: boolean,
  regex: boolean,
): number {
  return findMatchRanges(text, query, caseSensitive, regex).length;
}
