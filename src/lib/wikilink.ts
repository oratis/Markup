import type { VaultFile } from "../store";

/**
 * Find a vault file matching `name`. Match preference:
 *  1. exact basename (case-sensitive)
 *  2. exact basename without extension
 *  3. case-insensitive basename
 *  4. case-insensitive basename without extension
 */
export function findVaultFile(files: VaultFile[], name: string): VaultFile | null {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const lc = trimmed.toLowerCase();
  const stripExt = (s: string) => s.replace(/\.(md|markdown|mdx|mkd)$/i, "");
  const lcStripped = stripExt(lc);

  let lcExact: VaultFile | null = null;
  let lcStrippedHit: VaultFile | null = null;
  for (const f of files) {
    if (f.name === trimmed) return f;
    if (stripExt(f.name) === trimmed) return f;
    if (!lcExact && f.name.toLowerCase() === lc) lcExact = f;
    if (!lcStrippedHit && stripExt(f.name).toLowerCase() === lcStripped)
      lcStrippedHit = f;
  }
  return lcExact ?? lcStrippedHit;
}

/** Match `[[name]]` or `[[name|label]]`. Returns the trimmed name. */
const WIKILINK_RE = /\[\[\s*([^\]|]+?)(?:\s*\|[^\]]*)?\s*\]\]/g;

/**
 * Given a clicked text node + offset, find the wikilink the user clicked
 * inside (if any). Returns the captured name or null.
 */
export function wikilinkAtClick(
  node: Node | null,
  offsetWithinNode: number,
): string | null {
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.textContent ?? "";
  WIKILINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  m = WIKILINK_RE.exec(text);
  while (m) {
    const start = m.index;
    const end = start + m[0].length;
    if (offsetWithinNode >= start && offsetWithinNode <= end) {
      return m[1].trim();
    }
    m = WIKILINK_RE.exec(text);
  }
  return null;
}
