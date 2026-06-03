/** Count occurrences of `query` in `text`. When `regex` is true the
 *  query is compiled as a JS pattern (invalid pattern → 0). Case
 *  sensitivity is opt-in. Results are capped at 9999 to avoid pathological
 *  work on huge docs with very common needles.
 *
 *  Handles zero-length regex matches (e.g. `x*` against `"xabc"`) by
 *  manually advancing lastIndex when it doesn't move — without this, an
 *  empty-match-at-position-N would loop forever after the first iter. */
export function countMatches(
  text: string,
  query: string,
  caseSensitive: boolean,
  regex: boolean,
): number {
  if (!query) return 0;
  if (regex) {
    try {
      const re = new RegExp(query, caseSensitive ? "g" : "gi");
      let count = 0;
      let m = re.exec(text);
      while (m !== null) {
        count++;
        if (count >= 9999) break;
        // Zero-width match (anchors like ^ $ \b, lookaheads, x*): the engine
        // leaves lastIndex at the match position, so the next exec would match
        // the SAME spot again and double-count it. Advance past it so each
        // position is counted once (matches String.match(/…/g).length).
        if (m.index === re.lastIndex) {
          re.lastIndex++;
          if (re.lastIndex > text.length) break;
        }
        m = re.exec(text);
      }
      return count;
    } catch {
      return 0;
    }
  }
  const haystack = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();
  let count = 0;
  let i = 0;
  while (true) {
    const idx = haystack.indexOf(needle, i);
    if (idx < 0) break;
    count++;
    if (count >= 9999) break;
    i = idx + needle.length;
  }
  return count;
}
