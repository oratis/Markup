/**
 * Case-insensitive replace-all that preserves the source text outside
 * matches and the literal `replacement` inside them. Returns the new
 * text and the number of matches that were replaced.
 *
 * Uses `String.prototype.replaceAll` with a flag-`i` `RegExp` built from
 * `RegExp.escape`-style escaping (since the input is treated as a
 * literal, not a pattern). Bounded by the engine's regex implementation —
 * good for normal documents.
 */
export function replaceAll(
  haystack: string,
  needle: string,
  replacement: string,
  options: { caseSensitive?: boolean } = {},
): { text: string; count: number } {
  if (!needle) return { text: haystack, count: 0 };
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, options.caseSensitive ? "g" : "gi");
  let count = 0;
  const text = haystack.replace(re, () => {
    count++;
    return replacement;
  });
  return { text, count };
}

/** Replace only the first occurrence of `needle` (case-insensitive by
 * default) starting at or after `fromIndex`. Returns the new text plus
 * the index at which the replacement was made (or -1 when nothing
 * matched). */
export function replaceOnce(
  haystack: string,
  needle: string,
  replacement: string,
  options: { caseSensitive?: boolean; fromIndex?: number } = {},
): { text: string; index: number } {
  if (!needle) return { text: haystack, index: -1 };
  const cs = options.caseSensitive ?? false;
  const from = Math.max(0, options.fromIndex ?? 0);
  if (cs) {
    const idx = haystack.indexOf(needle, from);
    if (idx < 0) return { text: haystack, index: -1 };
    const text =
      haystack.slice(0, idx) + replacement + haystack.slice(idx + needle.length);
    return { text, index: idx };
  }
  // Case-insensitive: find via a flag-`i` RegExp so the match index refers to
  // the ORIGINAL string. The old approach searched in haystack.toLowerCase()
  // and spliced the original at that index — broken when an earlier char's
  // lowercase form has a different code-unit length (e.g. "İ" → "i̇"), which
  // shifts every subsequent index and corrupts the splice.
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "gi");
  re.lastIndex = from;
  const m = re.exec(haystack);
  if (!m) return { text: haystack, index: -1 };
  const idx = m.index;
  // Slice by the matched length, not needle.length — case folding can change
  // the span length.
  const text = haystack.slice(0, idx) + replacement + haystack.slice(idx + m[0].length);
  return { text, index: idx };
}
