import type { Heading } from "./headings";

/** GitHub-flavoured anchor slug for a heading text. Lowercases, strips
 *  punctuation, replaces whitespace with hyphens. Unicode letters are
 *  preserved so non-ASCII headings still produce anchors. */
export function ghSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N} \-_]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Find the heading an in-page `#anchor` link points at, matching the
 * GitHub-style slug `buildToc` emits (including `-N` suffixes for duplicate
 * slugs). Returns the heading or null when nothing matches.
 */
export function headingForAnchor(headings: Heading[], fragment: string): Heading | null {
  const want = fragment.trim().toLowerCase();
  if (!want) return null;
  const counts = new Map<string, number>();
  for (const h of headings) {
    const base = ghSlug(h.text);
    const n = counts.get(base) ?? 0;
    counts.set(base, n + 1);
    const anchor = n === 0 ? base : `${base}-${n}`;
    if (anchor === want) return h;
  }
  return null;
}

/** Build a markdown bullet-list table of contents from parsed headings.
 *  Indents by 2 spaces per nesting level (relative to the shallowest
 *  level in the doc) so docs that start at H2 don't gain phantom indent.
 *  Duplicate slugs get `-N` suffixes (GitHub-compatible). Returns "" for
 *  empty input. */
export function buildToc(headings: Heading[]): string {
  if (headings.length === 0) return "";
  const minLevel = headings.reduce((m, h) => Math.min(m, h.level), 6);
  const counts = new Map<string, number>();
  return headings
    .map((h) => {
      const indent = "  ".repeat(Math.max(0, h.level - minLevel));
      const base = ghSlug(h.text);
      const n = counts.get(base) ?? 0;
      counts.set(base, n + 1);
      const anchor = n === 0 ? base : `${base}-${n}`;
      return `${indent}- [${h.text}](#${anchor})`;
    })
    .join("\n");
}
