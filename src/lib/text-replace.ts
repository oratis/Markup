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
